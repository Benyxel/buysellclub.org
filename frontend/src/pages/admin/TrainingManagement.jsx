import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FaEdit, FaTrash, FaPlus, FaVideo, FaEye, FaPlay, FaGraduationCap, FaCalendarAlt, FaClock, FaUser, FaEnvelope, FaPhone, FaCheckCircle, FaTimesCircle, FaDollarSign, FaCreditCard } from 'react-icons/fa';
import { toast } from '../../utils/toast';
import {
  getAdminTrainingBookings,
  getAdminTrainingCourses,
  createTrainingCourse,
  updateTrainingCourse,
  deleteTrainingCourse,
} from '../../api';
import API, { Api } from '../../api';

const TrainingManagement = ({ showCoursesTab = true }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const tabOptions = useMemo(() => {
    const base = [
      {
        key: 'bookings',
        label: (
          <>
            <FaCalendarAlt className="inline mr-2" />
            Training Bookings
          </>
        ),
      },
    ];

    if (showCoursesTab) {
      base.push({
        key: 'courses',
        label: (
          <>
            <FaGraduationCap className="inline mr-2" />
            Courses Management
          </>
        ),
      });
    }

    return base;
  }, [showCoursesTab]);

  // Initialize activeTab from URL params or default to 'bookings'
  const getInitialTab = () => {
    const tabFromUrl = searchParams.get('tab');
    // Valid tabs
    const validTabs = ['bookings', 'courses'];
    if (tabFromUrl && validTabs.includes(tabFromUrl)) {
      // If courses tab is requested but not available, default to bookings
      if (tabFromUrl === 'courses' && !showCoursesTab) {
        return 'bookings';
      }
      return tabFromUrl;
    }
    return 'bookings';
  };

  const [activeTab, setActiveTab] = useState(() => getInitialTab());
  const [bookings, setBookings] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [currentCourse, setCurrentCourse] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [bookingFormData, setBookingFormData] = useState({
    trainingCost: '',
    paymentStatus: 'pending',
  });
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsData, setSettingsData] = useState({
    defaultTrainingCost: '',
    notes: '',
  });
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
  
  // Pagination state
  const [bookingsPage, setBookingsPage] = useState(1);
  const [coursesPage, setCoursesPage] = useState(1);
  const [bookingsPageSize, setBookingsPageSize] = useState(10);
  const [coursesPageSize, setCoursesPageSize] = useState(12);

  // Sync tab from URL on mount and when URL changes (browser back/forward)
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    const validTabs = ['bookings', 'courses'];
    
    if (tabFromUrl && validTabs.includes(tabFromUrl)) {
      // If courses tab is requested but not available, default to bookings
      const targetTab = (tabFromUrl === 'courses' && !showCoursesTab) ? 'bookings' : tabFromUrl;
      if (activeTab !== targetTab) {
        setActiveTab(targetTab);
      }
      if (targetTab !== tabFromUrl) {
        setSearchParams({ tab: targetTab }, { replace: true });
      }
    } else if (!tabFromUrl) {
      // No tab in URL, set default and update URL
      setSearchParams({ tab: 'bookings' }, { replace: true });
      if (activeTab !== 'bookings') {
        setActiveTab('bookings');
      }
    }
  }, [searchParams.get('tab'), showCoursesTab, activeTab, setSearchParams]); // React to URL tab parameter changes

  // Update URL when tab changes via user interaction
  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    setSearchParams({ tab: tabKey }, { replace: true });
    // Reset pagination when switching tabs
    setBookingsPage(1);
    setCoursesPage(1);
  };

  useEffect(() => {
    if (activeTab === 'bookings') {
      fetchBookings();
    } else if (activeTab === 'courses' && showCoursesTab) {
      fetchCourses();
    }
  }, [activeTab, showCoursesTab]);

  useEffect(() => {
    if (!showCoursesTab && activeTab === 'courses') {
      setActiveTab('bookings');
      setSearchParams({ tab: 'bookings' }, { replace: true });
    }
  }, [showCoursesTab, activeTab, setSearchParams]);

  const fetchBookings = async (forceRefresh = false) => {
    try {
      setLoading(true);
      // Always fetch fresh data
      const response = await getAdminTrainingBookings();
      setBookings(response.data || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
        method: error.config?.method,
      });
      const errorMsg = error.response?.data?.detail || 
                       error.response?.data?.error || 
                       error.response?.data?.message || 
                       error.message || 
                       'Failed to fetch training bookings';
      toast.error(errorMsg);
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
      console.log('Updating booking status:', bookingId, 'to', newStatus);
      const response = await API.put(`/buysellapi/admin/training-bookings/${bookingId}/`, { status: newStatus });
      console.log('Status update response:', response);
      toast.success('Booking status updated successfully');
      // Refresh bookings
      fetchBookings(true);
    } catch (error) {
      console.error('Error updating booking status:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      let errorMessage = 'Failed to update booking status';
      if (error.response?.data) {
        if (error.response.data.detail) {
          errorMessage = error.response.data.detail;
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        } else if (typeof error.response.data === 'object') {
          const errorFields = Object.keys(error.response.data);
          if (errorFields.length > 0) {
            const firstError = error.response.data[errorFields[0]];
            if (Array.isArray(firstError)) {
              errorMessage = firstError[0];
            } else if (typeof firstError === 'string') {
              errorMessage = firstError;
            }
          }
        }
      }
      toast.error(errorMessage);
    }
  };

  const openBookingModal = (booking) => {
    setSelectedBooking(booking);
    setBookingFormData({
      trainingCost: booking.trainingCost || booking.training_cost || '',
      paymentStatus: booking.paymentStatus || booking.payment_status || 'pending',
    });
    setShowBookingModal(true);
  };

  const handleBookingUpdate = async () => {
    if (!selectedBooking) return;
    
    // Validate form data
    if (!bookingFormData.trainingCost || parseFloat(bookingFormData.trainingCost) < 0) {
      toast.error('Please enter a valid training cost');
      return;
    }
    
    if (!bookingFormData.paymentStatus) {
      toast.error('Please select a payment status');
      return;
    }
    
    try {
      const updateData = {
        trainingCost: parseFloat(bookingFormData.trainingCost),
        paymentStatus: bookingFormData.paymentStatus,
      };
      
      console.log('Updating booking:', selectedBooking.id, 'with data:', updateData);
      const response = await API.put(`/buysellapi/admin/training-bookings/${selectedBooking.id}/`, updateData);
      console.log('Update response:', response);
      toast.success('Booking updated successfully');
      setShowBookingModal(false);
      setSelectedBooking(null);
      // Reset form
      setBookingFormData({
        trainingCost: '',
        paymentStatus: 'pending',
      });
      // Refresh bookings
      fetchBookings();
    } catch (error) {
      console.error('Error updating booking:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
        method: error.config?.method,
      });
      const errorMsg = error.response?.data?.detail || 
                       error.response?.data?.error || 
                       error.response?.data?.message ||
                       (typeof error.response?.data === 'object' && Object.keys(error.response?.data).length > 0 
                         ? JSON.stringify(error.response?.data) 
                         : null) ||
                       error.message || 
                       'Failed to update booking';
      toast.error(errorMsg);
    }
  };

  const fetchTrainingSettings = async () => {
    try {
      const response = await Api.training.settings();
      setSettingsData({
        defaultTrainingCost: response.data.defaultTrainingCost || response.data.default_training_cost || '',
        notes: response.data.notes || '',
      });
    } catch (error) {
      console.error('Error fetching training settings:', error);
      toast.error('Failed to fetch training settings');
    }
  };

  const handleUpdateSettings = async () => {
    try {
      if (!settingsData.defaultTrainingCost || parseFloat(settingsData.defaultTrainingCost) <= 0) {
        toast.error('Please enter a valid training cost');
        return;
      }
      
      await Api.training.updateSettings({
        defaultTrainingCost: parseFloat(settingsData.defaultTrainingCost),
      });
      toast.success('Training settings updated successfully');
      setShowSettingsModal(false);
      fetchTrainingSettings(); // Refresh settings
    } catch (error) {
      console.error('Error updating training settings:', error);
      toast.error(error.response?.data?.error || 'Failed to update training settings');
    }
  };

  const getPaymentStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', label: 'Pending' },
      paid: { color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', label: 'Paid' },
      failed: { color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', label: 'Failed' },
      refunded: { color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200', label: 'Refunded' },
    };
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
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
        {tabOptions.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === tab.key
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-600 dark:text-gray-400 hover:text-primary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Bookings Tab */}
      {activeTab === 'bookings' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Training Bookings</h2>
            <button
              onClick={() => {
                fetchTrainingSettings();
                setShowSettingsModal(true);
              }}
              className="bg-green-600 text-white px-3 py-1.5 rounded-lg flex items-center gap-2 hover:bg-green-700 transition-colors text-sm"
            >
              <FaDollarSign />
              Default Cost
            </button>
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
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white dark:bg-gray-800 rounded-lg shadow">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Name</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Contact</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Date & Time</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Cost</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Payment</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {bookings
                      .slice((bookingsPage - 1) * bookingsPageSize, bookingsPage * bookingsPageSize)
                      .map((booking) => (
                    <tr key={booking.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{booking.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{booking.user_name || booking.user_email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900 dark:text-white">{booking.email}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{booking.phone}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {new Date(booking.booking_date).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{booking.booking_time}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                          {booking.trainingCost || booking.training_cost ? (
                            <>GHS {Number(booking.trainingCost || booking.training_cost || 0).toFixed(2)}</>
                          ) : (
                            <span className="text-gray-400 text-xs">Not set</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">{getPaymentStatusBadge(booking.paymentStatus || booking.payment_status || 'pending')}</td>
                      <td className="px-4 py-3">{getStatusBadge(booking.status)}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openBookingModal(booking)}
                            className="text-primary hover:text-primary/80 text-sm"
                            title="Edit"
                          >
                            <FaEdit />
                          </button>
                          <select
                            value={booking.status}
                            onChange={(e) => updateBookingStatus(booking.id, e.target.value)}
                            className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          >
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </div>
                      </td>
                    </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              {bookings.length > 0 && (
                <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Page {bookingsPage} of {Math.max(1, Math.ceil(bookings.length / bookingsPageSize))} • Showing {Math.min(bookingsPage * bookingsPageSize, bookings.length)} of {bookings.length}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setBookingsPage(p => Math.max(1, p - 1))}
                      disabled={bookingsPage <= 1}
                      className={`px-3 py-1 rounded border text-sm ${
                        bookingsPage <= 1
                          ? "text-gray-400 border-gray-300 cursor-not-allowed dark:text-gray-600 dark:border-gray-700"
                          : "text-gray-700 border-gray-400 hover:bg-gray-100 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700"
                      }`}
                    >
                      Prev
                    </button>
                    <span className="text-sm text-gray-700 dark:text-gray-300 px-2">
                      {bookingsPage} / {Math.max(1, Math.ceil(bookings.length / bookingsPageSize))}
                    </span>
                    <button
                      onClick={() => setBookingsPage(p => Math.min(Math.ceil(bookings.length / bookingsPageSize), p + 1))}
                      disabled={bookingsPage >= Math.ceil(bookings.length / bookingsPageSize)}
                      className={`px-3 py-1 rounded border text-sm ${
                        bookingsPage >= Math.ceil(bookings.length / bookingsPageSize)
                          ? "text-gray-400 border-gray-300 cursor-not-allowed dark:text-gray-600 dark:border-gray-700"
                          : "text-gray-700 border-gray-400 hover:bg-gray-100 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700"
                      }`}
                    >
                      Next
                    </button>
                    <select
                      value={bookingsPageSize}
                      onChange={(e) => {
                        setBookingsPageSize(parseInt(e.target.value, 10));
                        setBookingsPage(1);
                      }}
                      className="ml-2 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    >
                      {[10, 20, 50, 100].map((sz) => (
                        <option key={sz} value={sz}>{sz}/page</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Courses Tab */}
      {activeTab === 'courses' && showCoursesTab && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Training Courses</h2>
            <button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="bg-primary text-white px-3 py-1.5 rounded-lg flex items-center gap-2 hover:bg-primary/90 transition-colors text-sm"
            >
              <FaPlus /> Add Course
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {courses
                  .slice((coursesPage - 1) * coursesPageSize, coursesPage * coursesPageSize)
                  .map(course => (
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
                  
                  <div className="p-3">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-1 line-clamp-1">{course.title}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">{course.description}</p>
                    
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-base font-bold text-primary">
                        ${parseFloat(course.price || 0).toFixed(2)}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{course.duration}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        course.is_active 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {course.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => editCourse(course)}
                          className="p-1.5 text-yellow-500 hover:text-yellow-600"
                          title="Edit"
                        >
                          <FaEdit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(course.id)}
                          className="p-1.5 text-red-500 hover:text-red-600"
                          title="Delete"
                        >
                          <FaTrash className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                ))}
              </div>
              
              {/* Pagination */}
              {courses.length > 0 && (
                <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Page {coursesPage} of {Math.max(1, Math.ceil(courses.length / coursesPageSize))} • Showing {Math.min(coursesPage * coursesPageSize, courses.length)} of {courses.length}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCoursesPage(p => Math.max(1, p - 1))}
                      disabled={coursesPage <= 1}
                      className={`px-3 py-1 rounded border text-sm ${
                        coursesPage <= 1
                          ? "text-gray-400 border-gray-300 cursor-not-allowed dark:text-gray-600 dark:border-gray-700"
                          : "text-gray-700 border-gray-400 hover:bg-gray-100 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700"
                      }`}
                    >
                      Prev
                    </button>
                    <span className="text-sm text-gray-700 dark:text-gray-300 px-2">
                      {coursesPage} / {Math.max(1, Math.ceil(courses.length / coursesPageSize))}
                    </span>
                    <button
                      onClick={() => setCoursesPage(p => Math.min(Math.ceil(courses.length / coursesPageSize), p + 1))}
                      disabled={coursesPage >= Math.ceil(courses.length / coursesPageSize)}
                      className={`px-3 py-1 rounded border text-sm ${
                        coursesPage >= Math.ceil(courses.length / coursesPageSize)
                          ? "text-gray-400 border-gray-300 cursor-not-allowed dark:text-gray-600 dark:border-gray-700"
                          : "text-gray-700 border-gray-400 hover:bg-gray-100 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700"
                      }`}
                    >
                      Next
                    </button>
                    <select
                      value={coursesPageSize}
                      onChange={(e) => {
                        setCoursesPageSize(parseInt(e.target.value, 10));
                        setCoursesPage(1);
                      }}
                      className="ml-2 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    >
                      {[12, 24, 48].map((sz) => (
                        <option key={sz} value={sz}>{sz}/page</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </>
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

      {/* Booking Cost/Payment Modal */}
      {showBookingModal && selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
              Set Training Cost & Payment Status
            </h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              handleBookingUpdate();
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Training Cost (GHS) *
                </label>
                <input
                  type="number"
                  value={bookingFormData.trainingCost}
                  onChange={(e) => setBookingFormData({...bookingFormData, trainingCost: e.target.value})}
                  className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Payment Status *
                </label>
                <select
                  value={bookingFormData.paymentStatus}
                  onChange={(e) => setBookingFormData({...bookingFormData, paymentStatus: e.target.value})}
                  className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                >
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="failed">Failed</option>
                  <option value="refunded">Refunded</option>
                </select>
              </div>

              {selectedBooking.paymentProof || selectedBooking.payment_proof ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Payment Proof
                  </label>
                  <img
                    src={selectedBooking.paymentProof || selectedBooking.payment_proof}
                    alt="Payment proof"
                    className="w-full max-h-48 object-contain border rounded-lg"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              ) : null}
              
              <div className="flex justify-end gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowBookingModal(false);
                    setSelectedBooking(null);
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                >
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Training Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
              Training Settings
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Default Training Cost (GHS) *
                </label>
                <input
                  type="number"
                  value={settingsData.defaultTrainingCost}
                  onChange={(e) => setSettingsData({...settingsData, defaultTrainingCost: e.target.value})}
                  className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  min="0"
                  step="0.01"
                  required
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  This cost will be shown to users when they book a training session.
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes
                </label>
                <textarea
                  value={settingsData.notes}
                  onChange={(e) => setSettingsData({...settingsData, notes: e.target.value})}
                  className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  rows="3"
                  placeholder="Optional notes about training settings..."
                />
              </div>
              
              <div className="flex justify-end gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateSettings}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                >
                  Update Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrainingManagement;
