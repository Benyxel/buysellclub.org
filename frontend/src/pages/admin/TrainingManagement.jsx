import React, { useState, useEffect } from 'react';
import { FaEdit, FaTrash, FaPlus, FaVideo, FaEye, FaPlay, FaGraduationCap, FaCalendarAlt, FaClock, FaUser, FaEnvelope, FaPhone, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import { toast } from 'react-toastify';
import {
  getAdminTrainingBookings,
  getAdminTrainingCourses,
  createTrainingCourse,
  updateTrainingCourse,
  deleteTrainingCourse,
} from '../../api';
import API from '../../api';

const TrainingManagement = () => {
  const [activeTab, setActiveTab] = useState('bookings'); // 'bookings' or 'courses'
  const [bookings, setBookings] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [currentCourse, setCurrentCourse] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    course_type: 'premium',
    price: '',
    duration: '',
    thumbnail: '',
    video_url: '',
    is_active: true,
    order: 0,
  });

  useEffect(() => {
    if (activeTab === 'bookings') {
      fetchBookings();
    } else {
      fetchCourses();
    }
  }, [activeTab]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const response = await getAdminTrainingBookings();
      setBookings(response.data || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast.error('Failed to fetch training bookings');
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const response = await getAdminTrainingCourses();
      setCourses(response.data || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast.error('Failed to fetch courses');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        price: parseFloat(formData.price) || 0,
        order: parseInt(formData.order) || 0,
      };

      if (currentCourse) {
        await updateTrainingCourse(currentCourse.id, data);
        toast.success('Course updated successfully');
      } else {
        await createTrainingCourse(data);
        toast.success('Course created successfully');
      }

      setShowModal(false);
      resetForm();
      fetchCourses();
    } catch (error) {
      console.error('Error saving course:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.detail || error.message || 'Failed to save course';
      toast.error(errorMessage);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this course?')) {
      return;
    }
    
    try {
      await deleteTrainingCourse(id);
      toast.success('Course deleted successfully');
      fetchCourses();
    } catch (error) {
      console.error('Error deleting course:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.detail || error.message || 'Failed to delete course';
      toast.error(errorMessage);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      course_type: 'premium',
      price: '',
      duration: '',
      thumbnail: '',
      video_url: '',
      is_active: true,
      order: 0,
    });
    setCurrentCourse(null);
  };

  const editCourse = (course) => {
    setCurrentCourse(course);
    setFormData({
      title: course.title || '',
      description: course.description || '',
      course_type: course.course_type || 'premium',
      price: course.price || '',
      duration: course.duration || '',
      thumbnail: course.thumbnail || '',
      video_url: course.video_url || '',
      is_active: course.is_active !== undefined ? course.is_active : true,
      order: course.order || 0,
    });
    setShowModal(true);
  };

  const updateBookingStatus = async (bookingId, newStatus) => {
    try {
      await API.put(`/buysellapi/admin/training-bookings/${bookingId}/`, { status: newStatus });
      toast.success('Booking status updated successfully');
      fetchBookings();
    } catch (error) {
      console.error('Error updating booking status:', error);
      toast.error('Failed to update booking status');
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', icon: FaClock },
      confirmed: { color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', icon: FaCheckCircle },
      completed: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', icon: FaCheckCircle },
      cancelled: { color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', icon: FaTimesCircle },
    };
    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${config.color}`}>
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className="container mx-auto px-4">
      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('bookings')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'bookings'
              ? 'text-primary border-b-2 border-primary'
              : 'text-gray-600 dark:text-gray-400 hover:text-primary'
          }`}
        >
          <FaCalendarAlt className="inline mr-2" />
          Training Bookings
        </button>
        <button
          onClick={() => setActiveTab('courses')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'courses'
              ? 'text-primary border-b-2 border-primary'
              : 'text-gray-600 dark:text-gray-400 hover:text-primary'
          }`}
        >
          <FaGraduationCap className="inline mr-2" />
          Courses Management
        </button>
      </div>

      {/* Bookings Tab */}
      {activeTab === 'bookings' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Training Bookings</h2>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : bookings.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <FaCalendarAlt className="mx-auto text-4xl mb-4" />
              <p>No training bookings found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white dark:bg-gray-800 rounded-lg shadow">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date & Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Passport</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {bookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{booking.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{booking.user_name || booking.user_email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">{booking.email}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{booking.phone}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          <FaCalendarAlt className="inline mr-1" />
                          {new Date(booking.booking_date).toLocaleDateString()}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          <FaClock className="inline mr-1" />
                          {booking.booking_time}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(booking.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {booking.has_valid_passport ? (
                          <span className="text-green-600 dark:text-green-400">
                            <FaCheckCircle className="inline mr-1" />
                            Valid
                          </span>
                        ) : (
                          <span className="text-red-600 dark:text-red-400">
                            <FaTimesCircle className="inline mr-1" />
                            Invalid
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <select
                          value={booking.status}
                          onChange={(e) => updateBookingStatus(booking.id, e.target.value)}
                          className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          <option value="pending">Pending</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Courses Tab */}
      {activeTab === 'courses' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Training Courses Management</h2>
            <button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary/90 transition-colors"
            >
              <FaPlus /> Add New Course
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map(course => (
                <div key={course.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                  <div className="relative h-48">
                    {course.thumbnail ? (
                      <img
                        src={course.thumbnail}
                        alt={course.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                        <FaVideo className="text-4xl text-gray-400" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        course.course_type === 'youtube' 
                          ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                      }`}>
                        {course.course_type_display || course.course_type}
                      </span>
                    </div>
                    {course.video_url && (
                      <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => window.open(course.video_url, '_blank')}
                          className="p-2 bg-white rounded-full text-primary hover:text-primary/90"
                        >
                          <FaPlay className="w-6 h-6" />
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-4">
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">{course.title}</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">{course.description}</p>
                    
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-lg font-bold text-primary">
                        ${parseFloat(course.price || 0).toFixed(2)}
                      </span>
                      <span className="text-gray-500 dark:text-gray-400">{course.duration}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className={`px-2 py-1 rounded text-xs ${
                        course.is_active 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {course.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => editCourse(course)}
                          className="p-2 text-yellow-500 hover:text-yellow-600"
                          title="Edit course"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => handleDelete(course.id)}
                          className="p-2 text-red-500 hover:text-red-600"
                          title="Delete course"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Course Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
              {currentCourse ? 'Edit Course' : 'Add New Course'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  rows="3"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Course Type *</label>
                  <select
                    value={formData.course_type}
                    onChange={(e) => setFormData({...formData, course_type: e.target.value})}
                    className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    required
                  >
                    <option value="premium">Premium</option>
                    <option value="youtube">YouTube</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Price ($) *</label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                    className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Duration</label>
                  <input
                    type="text"
                    value={formData.duration}
                    onChange={(e) => setFormData({...formData, duration: e.target.value})}
                    className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="e.g., 1h 20m"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Order</label>
                  <input
                    type="number"
                    value={formData.order}
                    onChange={(e) => setFormData({...formData, order: e.target.value})}
                    className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    min="0"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Thumbnail URL</label>
                <input
                  type="url"
                  value={formData.thumbnail}
                  onChange={(e) => setFormData({...formData, thumbnail: e.target.value})}
                  className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="https://example.com/image.jpg"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Video URL *</label>
                <input
                  type="url"
                  value={formData.video_url}
                  onChange={(e) => setFormData({...formData, video_url: e.target.value})}
                  className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="https://youtube.com/watch?v=..."
                  required
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  For YouTube videos, paste the full YouTube URL. The video ID will be extracted automatically.
                </p>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                  className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
                />
                <label htmlFor="is_active" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                  Active (visible to users)
                </label>
              </div>
              
              <div className="flex justify-end gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                >
                  {currentCourse ? 'Update' : 'Create'} Course
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrainingManagement;
