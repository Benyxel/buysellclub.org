import React, { useState, useEffect } from 'react';
import { FaEdit, FaTrash, FaPlus, FaYoutube, FaUpload } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { getApiUrl } from '../../config/api';

const YouTubeManagement = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [currentVideo, setCurrentVideo] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    videoUrl: ''
  });
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const fetchVideos = async () => {
    try {
      const response = await fetch(getApiUrl('api/admin/youtube-videos'), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch videos');
      }

      const data = await response.json();
      setVideos(data);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to fetch videos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate image file
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload a valid image file');
      return;
    }
    setThumbnailFile(file);
  };

  const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'thumbnail');

    try {
      const response = await fetch(getApiUrl('api/admin/upload'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to upload thumbnail');
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
      let thumbnailUrl = currentVideo?.thumbnail;

      // Upload thumbnail if new file is selected
      if (thumbnailFile) {
        setUploadProgress(50);
        thumbnailUrl = await uploadFile(thumbnailFile);
        setUploadProgress(80);
      }

      // Get YouTube video ID for thumbnail if no custom thumbnail is provided
      const youtubeId = getYouTubeVideoId(formData.videoUrl);
      const defaultThumbnail = `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`;

      const url = currentVideo 
        ? getApiUrl(`api/admin/youtube-videos/${currentVideo._id}`)
        : getApiUrl('api/admin/youtube-videos');
      
      const response = await fetch(url, {
        method: currentVideo ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          videoUrl: formData.videoUrl,
          thumbnail: thumbnailUrl || defaultThumbnail
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save video');
      }

      setUploadProgress(100);
      toast.success(`Video ${currentVideo ? 'updated' : 'added'} successfully`);
      setShowModal(false);
      fetchVideos();
      resetForm();
    } catch (error) {
      console.error('Error:', error);
      toast.error(error.message || 'Failed to save video');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this video?')) {
      return;
    }
    
    try {
      const response = await fetch(getApiUrl(`api/admin/youtube-videos/${id}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete video');
      }
      
      toast.success('Video deleted successfully');
      fetchVideos();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to delete video');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      videoUrl: ''
    });
    setThumbnailFile(null);
    setCurrentVideo(null);
    setUploadProgress(0);
  };

  const editVideo = (video) => {
    setCurrentVideo(video);
    setFormData({
      title: video.title,
      description: video.description,
      videoUrl: video.videoUrl
    });
    setShowModal(true);
  };

  const getYouTubeVideoId = (url) => {
    try {
      const urlObj = new URL(url);
      if (urlObj.hostname === 'youtu.be') {
        return urlObj.pathname.slice(1);
      }
      return urlObj.searchParams.get('v') || '';
    } catch {
      return '';
    }
  };

  return (
    <div className="container mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white">YouTube Videos</h3>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your YouTube video content</p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-red-700 transition-colors"
          >
            <FaPlus /> Add New Video
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map(video => (
              <div key={video._id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                <div className="relative h-48">
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://via.placeholder.com/400x225?text=Video+Thumbnail';
                    }}
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <a
                      href={video.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-white rounded-full text-red-600 hover:text-red-700"
                    >
                      <FaYoutube size={24} />
                    </a>
                  </div>
                </div>
                
                <div className="p-4">
                  <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">{video.title}</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">{video.description}</p>
                  
                  <div className="flex justify-end">
                    <div className="flex gap-2">
                      <button
                        onClick={() => editVideo(video)}
                        className="p-2 text-yellow-500 hover:text-yellow-600"
                        title="Edit video"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => handleDelete(video._id)}
                        className="p-2 text-red-500 hover:text-red-600"
                        title="Delete video"
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

      {/* Add/Edit Video Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
              {currentVideo ? 'Edit Video' : 'Add New Video'}
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

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">YouTube Video URL</label>
                <input
                  type="url"
                  value={formData.videoUrl}
                  onChange={(e) => setFormData({...formData, videoUrl: e.target.value})}
                  className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="https://www.youtube.com/watch?v=..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Custom Thumbnail (Optional)</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="file"
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                    id="thumbnailFile"
                  />
                  <label
                    htmlFor="thumbnailFile"
                    className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    <FaUpload />
                    <span>{thumbnailFile ? thumbnailFile.name : 'Choose Thumbnail'}</span>
                  </label>
                  {currentVideo?.thumbnail && !thumbnailFile && (
                    <span className="text-sm text-gray-500">Current thumbnail will be kept</span>
                  )}
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  If no custom thumbnail is provided, the default YouTube thumbnail will be used.
                </p>
              </div>
              
              {uploadProgress > 0 && (
                <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                  <div 
                    className="bg-red-600 h-2.5 rounded-full transition-all duration-300" 
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
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  {currentVideo ? 'Update' : 'Add'} Video
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default YouTubeManagement; 