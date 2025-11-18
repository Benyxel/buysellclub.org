import React, { useState, useEffect } from 'react';
import { FaEdit, FaTrash, FaPlus, FaVideo, FaEye, FaPlay, FaUpload } from 'react-icons/fa';
import { toast } from 'react-toastify';
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
    category: '',
    isPremium: false
  });
  const [videoFile, setVideoFile] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const fetchCourses = async () => {
    try {
      const response = await fetch(getApiUrl('api/admin/training-courses?type=paid'), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch courses');
      }

      const data = await response.json();
      setCourses(data);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to fetch courses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    if (type === 'video') {
      // Validate video file
      if (!file.type.startsWith('video/')) {
        toast.error('Please upload a valid video file');
        return;
      }
      setVideoFile(file);
    } else if (type === 'thumbnail') {
      // Validate image file
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload a valid image file');
        return;
      }
      setThumbnailFile(file);
    }
  };

  const uploadFile = async (file, type) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    try {
      const response = await fetch(getApiUrl('api/admin/upload'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Failed to upload ${type}`);
      }

      const data = await response.json();
      return data.filePath;
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setUploadProgress(0);
      let videoUrl = currentCourse?.videoUrl;
      let thumbnailUrl = currentCourse?.thumbnail;

      // Upload video if new file is selected
      if (videoFile) {
        setUploadProgress(10);
        videoUrl = await uploadFile(videoFile, 'video');
        setUploadProgress(60);
      }

      // Upload thumbnail if new file is selected
      if (thumbnailFile) {
        setUploadProgress(70);
        thumbnailUrl = await uploadFile(thumbnailFile, 'thumbnail');
        setUploadProgress(90);
      }

      const url = currentCourse 
        ? getApiUrl(`api/admin/training-courses/${currentCourse._id}`)
        : getApiUrl('api/admin/training-courses');
      
      const response = await fetch(url, {
        method: currentCourse ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({
          ...formData,
          type: 'paid',
          videoUrl: videoUrl || formData.videoUrl,
          thumbnail: thumbnailUrl || formData.thumbnail,
          price: parseFloat(formData.price),
          isPremium: Boolean(formData.isPremium)
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save course');
      }

      setUploadProgress(100);
      toast.success(`Course ${currentCourse ? 'updated' : 'created'} successfully`);
      setShowModal(false);
      fetchCourses();
      resetForm();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to save course');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this course?')) {
      return;
    }
    
    try {
      const response = await fetch(getApiUrl(`api/admin/training-courses/${id}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete course');
      }
      
      toast.success('Course deleted successfully');
      fetchCourses();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to delete course');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      price: '',
      duration: '',
      category: '',
      isPremium: false
    });
    setVideoFile(null);
    setThumbnailFile(null);
    setCurrentCourse(null);
    setUploadProgress(0);
  };

  const editCourse = (course) => {
    setCurrentCourse(course);
    setFormData({
      title: course.title,
      description: course.description,
      price: course.price,
      duration: course.duration,
      category: course.category,
      isPremium: course.isPremium
    });
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map(course => (
              <div key={course._id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden transform hover:scale-105 transition-transform duration-200">
                <div className="relative h-48">
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
                      onClick={() => window.open(course.videoUrl, '_blank')}
                      className="p-3 bg-white rounded-full text-primary hover:text-primary/90 transform hover:scale-110 transition-transform"
                    >
                      <FaPlay className="w-6 h-6" />
                    </button>
                  </div>
                  {course.isPremium && (
                    <div className="absolute top-2 right-2 bg-yellow-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                      Premium
                    </div>
                  )}
                </div>
                
                <div className="p-4">
                  <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">{course.title}</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">{course.description}</p>
                  
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-2xl font-bold text-primary">
                      ${course.price.toFixed(2)}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400 text-sm">
                      {course.duration}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex gap-2">
                      <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded text-sm">
                        {course.category}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => editCourse(course)}
                        className="p-2 text-yellow-500 hover:text-yellow-600"
                        title="Edit course"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => handleDelete(course._id)}
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

      {/* Add/Edit Course Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
              {currentCourse ? 'Edit Course' : 'Add New Course'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
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
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Price ($)</label>
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Duration</label>
                  <input
                    type="text"
                    value={formData.duration}
                    onChange={(e) => setFormData({...formData, duration: e.target.value})}
                    className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="e.g., 2 hours"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="e.g., Business, Technology, Marketing"
                  required
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isPremium"
                  checked={formData.isPremium}
                  onChange={(e) => setFormData({...formData, isPremium: e.target.checked})}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="isPremium" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Premium Course
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Video</label>
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    onChange={(e) => handleFileChange(e, 'video')}
                    accept="video/*"
                    className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                  {formData.videoUrl && (
                    <button
                      type="button"
                      onClick={() => window.open(formData.videoUrl, '_blank')}
                      className="p-2 text-blue-600 hover:text-blue-700"
                      title="Preview video"
                    >
                      <FaPlay />
                    </button>
                  )}
                </div>
                {videoFile && (
                  <p className="mt-1 text-sm text-gray-500">Selected: {videoFile.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Thumbnail</label>
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    onChange={(e) => handleFileChange(e, 'thumbnail')}
                    accept="image/*"
                    className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                  {formData.thumbnail && (
                    <img
                      src={formData.thumbnail}
                      alt="Thumbnail preview"
                      className="h-10 w-10 object-cover rounded"
                    />
                  )}
                </div>
                {thumbnailFile && (
                  <p className="mt-1 text-sm text-gray-500">Selected: {thumbnailFile.name}</p>
                )}
              </div>

              {uploadProgress > 0 && (
                <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              )}
              
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
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  disabled={uploadProgress > 0 && uploadProgress < 100}
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

export default PaidCourseManagement; 