import React, { useState, useEffect } from 'react';
import { FaEdit, FaTrash, FaPlus, FaVideo, FaEye, FaPlay, FaUpload, FaTimes } from 'react-icons/fa';
import { toast } from '../../utils/toast';
import {
  getAdminTrainingCourses,
  createTrainingCourse,
  updateTrainingCourse,
  deleteTrainingCourse,
} from '../../api';
import { getApiUrl } from '../../config/api';

const PaidCourseManagement = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [currentCourse, setCurrentCourse] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    duration: '',
    videoUrl: '',
    thumbnail: ''
  });
  const [videoFile, setVideoFile] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [videoInputType, setVideoInputType] = useState('file'); // 'file' or 'url'
  const [errors, setErrors] = useState({});

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const response = await getAdminTrainingCourses();
      const allCourses = response.data || [];
      // Filter only premium courses
      const premiumCourses = allCourses.filter(course => course.course_type === 'premium');
      setCourses(premiumCourses);
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast.error('Failed to fetch courses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }
    
    if (!formData.price || parseFloat(formData.price) < 0) {
      newErrors.price = 'Valid price is required';
    }
    
    if (!formData.duration.trim()) {
      newErrors.duration = 'Duration is required';
    }
    
    // Video validation
    if (videoInputType === 'file' && !videoFile && !formData.videoUrl) {
      if (!currentCourse) {
        newErrors.video = 'Video file or URL is required';
      }
    } else if (videoInputType === 'url' && !formData.videoUrl.trim()) {
      newErrors.video = 'Video URL is required';
    }
    
    // Thumbnail validation
    if (!thumbnailFile && !formData.thumbnail) {
      if (!currentCourse) {
        newErrors.thumbnail = 'Thumbnail is required';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (!file) {
      if (type === 'video') setVideoFile(null);
      if (type === 'thumbnail') setThumbnailFile(null);
      return;
    }

    if (type === 'video') {
      // Validate video file size (max 500MB)
      const maxSize = 500 * 1024 * 1024; // 500MB
      if (file.size > maxSize) {
        toast.error('Video file size must be less than 500MB');
        return;
      }
      // Validate video file
      if (!file.type.startsWith('video/')) {
        toast.error('Please upload a valid video file');
        return;
      }
      setVideoFile(file);
      setErrors({...errors, video: ''});
    } else if (type === 'thumbnail') {
      // Validate image file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        toast.error('Image file size must be less than 10MB');
        return;
      }
      // Validate image file
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload a valid image file');
        return;
      }
      setThumbnailFile(file);
      setErrors({...errors, thumbnail: ''});
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        // Preview is handled by the file input
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadFile = async (file, type) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      // Ensure URL has trailing slash to match Django pattern
      const uploadUrl = getApiUrl('buysellapi/admin/upload/');
      console.log('Uploading file to:', uploadUrl);
      console.log('File info:', {
        name: file.name,
        size: file.size,
        type: file.type,
        uploadType: type
      });
      
      let response;
      try {
        response = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
            // Don't set Content-Type header - let browser set it with boundary for FormData
          },
          body: formData
        });
      } catch (fetchError) {
        console.error('Network error during upload:', fetchError);
        throw new Error(`Network error: ${fetchError.message}. Please check your connection and try again.`);
      }
      
      console.log('Upload response status:', response.status, response.statusText);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        let errorMessage = `Failed to upload ${type}`;
        let errorDetails = null;
        let responseText = '';
        
        try {
          // Try to get response as text first
          responseText = await response.text();
          console.log('Error response text:', responseText);
          
          // Try to parse as JSON
          if (responseText.trim().startsWith('{') || responseText.trim().startsWith('[')) {
            try {
              errorDetails = JSON.parse(responseText);
              errorMessage = errorDetails.error || errorDetails.detail || errorDetails.message || errorMessage;
              console.log('Parsed error details:', errorDetails);
            } catch (parseError) {
              console.warn('Failed to parse error response as JSON:', parseError);
              errorMessage = responseText || errorMessage;
            }
          } else {
            errorMessage = responseText || errorMessage;
          }
        } catch (e) {
          console.error('Error reading response:', e);
          errorMessage = `Server error (${response.status}): ${response.statusText}`;
        }
        
        console.error(`Upload failed (${response.status}):`, {
          status: response.status,
          statusText: response.statusText,
          errorMessage,
          errorDetails,
          responseText,
          url: uploadUrl
        });
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('Upload success, response data:', data);
      // Handle both response formats: filePath or url
      return data.filePath || data.url || data.saved_path;
    } catch (error) {
      console.error('Upload error:', error);
      console.error('Error stack:', error.stack);
      console.error('File details:', {
        name: file.name,
        size: file.size,
        type: file.type
      });
      // Re-throw with original error message
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }
    
    setIsSubmitting(true);
    setUploadProgress(0);
    
    try {
      let videoUrl = currentCourse?.video_url || formData.videoUrl || '';
      let thumbnailUrl = currentCourse?.thumbnail || formData.thumbnail || '';

      // Upload video if new file is selected
      if (videoFile) {
        setUploadProgress(10);
        try {
          videoUrl = await uploadFile(videoFile, 'video');
          setUploadProgress(60);
          toast.success('Video uploaded successfully');
        } catch (error) {
          console.error('Video upload error details:', error);
          const errorMsg = error.message || 'Unknown error occurred';
          // Show the actual error message from backend
          toast.error(`Video upload failed: ${errorMsg}`);
          // Don't wrap the error again, just throw it as is
          throw error;
        }
      } else if (videoInputType === 'url' && formData.videoUrl.trim()) {
        videoUrl = formData.videoUrl.trim();
        // Ensure URL has protocol
        if (!videoUrl.startsWith('http://') && !videoUrl.startsWith('https://')) {
          videoUrl = 'https://' + videoUrl;
        }
      }

      // Upload thumbnail if new file is selected
      if (thumbnailFile) {
        setUploadProgress(70);
        try {
          thumbnailUrl = await uploadFile(thumbnailFile, 'thumbnail');
          setUploadProgress(90);
          toast.success('Thumbnail uploaded successfully');
        } catch (error) {
          throw new Error(`Failed to upload thumbnail: ${error.message}`);
        }
      }

      const data = {
        title: formData.title.trim(),
        description: formData.description.trim() || '',
        course_type: 'premium', // Always set to premium for this component
        video_url: videoUrl || '',
        thumbnail: thumbnailUrl || '',
        price: parseFloat(formData.price) || 0,
        duration: formData.duration.trim() || '',
        order: 0,
        is_active: true,
      };

      setUploadProgress(95);
      
      if (currentCourse) {
        await updateTrainingCourse(currentCourse.id, data);
        toast.success('Course updated successfully');
      } else {
        await createTrainingCourse(data);
        toast.success('Course created successfully');
      }

      setUploadProgress(100);
      setTimeout(() => {
        setShowModal(false);
        fetchCourses();
        resetForm();
      }, 500);
    } catch (error) {
      console.error('Error saving course:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.detail || error.message || 'Failed to save course';
      toast.error(errorMessage);
      setUploadProgress(0);
    } finally {
      setIsSubmitting(false);
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
      price: '',
      duration: '',
      videoUrl: '',
      thumbnail: ''
    });
    setVideoFile(null);
    setThumbnailFile(null);
    setCurrentCourse(null);
    setUploadProgress(0);
    setVideoInputType('file');
    setErrors({});
    setIsSubmitting(false);
  };

  const editCourse = (course) => {
    setCurrentCourse(course);
    setFormData({
      title: course.title || '',
      description: course.description || '',
      price: course.price || '',
      duration: course.duration || '',
      videoUrl: course.video_url || '',
      thumbnail: course.thumbnail || '',
    });
    setVideoFile(null);
    setThumbnailFile(null);
    setVideoInputType(course.video_url && !course.video_url.includes('/media/') ? 'url' : 'file');
    setErrors({});
    setShowModal(true);
  };

  return (
    <div className="container mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white">Paid Courses</h3>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your premium training courses</p>
          </div>
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
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {courses.map(course => (
              <div key={course.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden transform hover:scale-105 transition-transform duration-200">
                <div className="relative h-32">
                  <img
                    src={course.thumbnail}
                    alt={course.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://via.placeholder.com/400x225?text=Course+Thumbnail';
                    }}
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => course.video_url && window.open(course.video_url, '_blank')}
                      className="p-2 bg-white rounded-full text-primary hover:text-primary/90 transform hover:scale-110 transition-transform"
                    >
                      <FaPlay className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="absolute top-1 right-1">
                    <span className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-0.5 rounded-full text-xs font-semibold">
                      Premium
                    </span>
                  </div>
                </div>
                
                <div className="p-3">
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-1 line-clamp-1">{course.title}</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-2 text-xs line-clamp-2">{course.description}</p>
                  
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg font-bold text-primary">
                      ₵{(parseFloat(course.price) || 0).toFixed(2)}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400 text-xs">
                      {course.duration}
                    </span>
                  </div>
                  
                  <div className="flex justify-end items-center">
                    <div className="flex gap-1">
                      <button
                        onClick={() => editCourse(course)}
                        className="p-1.5 text-yellow-500 hover:text-yellow-600"
                        title="Edit course"
                      >
                        <FaEdit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(course.id)}
                        className="p-1.5 text-red-500 hover:text-red-600"
                        title="Delete course"
                      >
                        <FaTrash className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Course Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-3xl my-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-800 dark:text-white">
                {currentCourse ? 'Edit Course' : 'Add New Course'}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                disabled={isSubmitting}
              >
                <FaTimes className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Course Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => {
                    setFormData({...formData, title: e.target.value});
                    setErrors({...errors, title: ''});
                  }}
                  className={`w-full p-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                    errors.title ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter course title"
                />
                {errors.title && <p className="mt-1 text-sm text-red-500">{errors.title}</p>}
              </div>
              
              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => {
                    setFormData({...formData, description: e.target.value});
                    setErrors({...errors, description: ''});
                  }}
                  className={`w-full p-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                    errors.description ? 'border-red-500' : 'border-gray-300'
                  }`}
                  rows="4"
                  placeholder="Enter course description"
                />
                {errors.description && <p className="mt-1 text-sm text-red-500">{errors.description}</p>}
              </div>
              
              {/* Price and Duration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Price (GHS) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => {
                      setFormData({...formData, price: e.target.value});
                      setErrors({...errors, price: ''});
                    }}
                    className={`w-full p-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                      errors.price ? 'border-red-500' : 'border-gray-300'
                    }`}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                  />
                  {errors.price && <p className="mt-1 text-sm text-red-500">{errors.price}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Duration <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.duration}
                    onChange={(e) => {
                      setFormData({...formData, duration: e.target.value});
                      setErrors({...errors, duration: ''});
                    }}
                    className={`w-full p-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                      errors.duration ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="e.g., 2 hours, 1h 30m"
                  />
                  {errors.duration && <p className="mt-1 text-sm text-red-500">{errors.duration}</p>}
                </div>
              </div>

              {/* Video Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Video <span className="text-red-500">*</span>
                </label>
                
                {/* Toggle between file and URL */}
                <div className="flex gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => {
                      setVideoInputType('file');
                      setVideoFile(null);
                      setErrors({...errors, video: ''});
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      videoInputType === 'file'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    Upload File
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setVideoInputType('url');
                      setVideoFile(null);
                      setErrors({...errors, video: ''});
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      videoInputType === 'url'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    Video URL
                  </button>
                </div>

                {videoInputType === 'file' ? (
                  <div>
                    <input
                      type="file"
                      onChange={(e) => handleFileChange(e, 'video')}
                      accept="video/*"
                      className={`w-full p-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                        errors.video ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {videoFile && (
                      <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-700 rounded">
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          Selected: <span className="font-medium">{videoFile.name}</span> ({(videoFile.size / 1024 / 1024).toFixed(2)} MB)
                        </p>
                      </div>
                    )}
                    {formData.videoUrl && !videoFile && (
                      <div className="mt-2 flex items-center gap-2">
                        <p className="text-sm text-gray-600 dark:text-gray-300">Current video:</p>
                        <button
                          type="button"
                          onClick={() => window.open(formData.videoUrl, '_blank')}
                          className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
                        >
                          <FaPlay /> Preview
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <input
                      type="url"
                      value={formData.videoUrl}
                      onChange={(e) => {
                        setFormData({...formData, videoUrl: e.target.value});
                        setErrors({...errors, video: ''});
                      }}
                      className={`w-full p-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                        errors.video ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="https://example.com/video.mp4"
                    />
                    {formData.videoUrl && (
                      <button
                        type="button"
                        onClick={() => window.open(formData.videoUrl, '_blank')}
                        className="mt-2 text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
                      >
                        <FaPlay /> Preview Video
                      </button>
                    )}
                  </div>
                )}
                {errors.video && <p className="mt-1 text-sm text-red-500">{errors.video}</p>}
              </div>

              {/* Thumbnail */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Thumbnail Image <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-4">
                  <input
                    type="file"
                    onChange={(e) => handleFileChange(e, 'thumbnail')}
                    accept="image/*"
                    className={`flex-1 p-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                      errors.thumbnail ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {(formData.thumbnail || thumbnailFile) && (
                    <div className="flex-shrink-0">
                      <img
                        src={thumbnailFile ? URL.createObjectURL(thumbnailFile) : formData.thumbnail}
                        alt="Thumbnail preview"
                        className="h-20 w-32 object-cover rounded border border-gray-300 dark:border-gray-600"
                      />
                    </div>
                  )}
                </div>
                {thumbnailFile && (
                  <p className="mt-2 text-sm text-gray-500">
                    Selected: {thumbnailFile.name} ({(thumbnailFile.size / 1024).toFixed(2)} KB)
                  </p>
                )}
                {errors.thumbnail && <p className="mt-1 text-sm text-red-500">{errors.thumbnail}</p>}
              </div>

              {/* Upload Progress */}
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="w-full">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Uploading...</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 dark:bg-gray-700">
                    <div
                      className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}
              
              {/* Form Actions */}
              <div className="flex justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  disabled={isSubmitting || (uploadProgress > 0 && uploadProgress < 100)}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      {currentCourse ? 'Update' : 'Create'} Course
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaidCourseManagement; 