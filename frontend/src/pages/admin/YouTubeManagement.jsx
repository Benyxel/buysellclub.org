import React, { useState, useEffect } from 'react';
import { FaEdit, FaTrash, FaPlus, FaYoutube } from 'react-icons/fa';
import { toast } from 'react-toastify';
import {
  getAdminTrainingCourses,
  createTrainingCourse,
  updateTrainingCourse,
  deleteTrainingCourse,
} from '../../api';

const YouTubeManagement = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [currentVideo, setCurrentVideo] = useState(null);
  const [formData, setFormData] = useState({
    video_url: '',
    thumbnail: '',
  });

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      const response = await getAdminTrainingCourses();
      const allCourses = response.data || [];
      // Filter only YouTube courses
      const youtubeCourses = allCourses.filter(course => course.course_type === 'youtube');
      setVideos(youtubeCourses);
    } catch (error) {
      console.error('Error fetching videos:', error);
      toast.error('Failed to fetch videos');
    } finally {
      setLoading(false);
    }
  };

  const getYouTubeVideoId = (url) => {
    if (!url) return '';
    try {
      const urlObj = new URL(url);
      if (urlObj.hostname === 'youtu.be') {
        return urlObj.pathname.slice(1);
      }
      return urlObj.searchParams.get('v') || '';
    } catch {
      // Try regex extraction as fallback
      const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
      return match ? match[1] : '';
    }
  };

  const getYouTubeThumbnail = (url) => {
    const videoId = getYouTubeVideoId(url);
    if (videoId) {
      return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    }
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Auto-generate thumbnail from YouTube URL if not provided
      let thumbnail = formData.thumbnail;
      if (!thumbnail && formData.video_url) {
        thumbnail = getYouTubeThumbnail(formData.video_url);
      }

      // Extract video ID for title if needed
      const videoId = getYouTubeVideoId(formData.video_url);
      const defaultTitle = videoId ? `YouTube Video ${videoId}` : 'YouTube Video';

      const data = {
        title: currentVideo ? currentVideo.title : defaultTitle, // Keep existing title if editing, otherwise use default
        description: currentVideo ? currentVideo.description : '', // Keep existing description if editing
        course_type: 'youtube', // Always set to youtube for this component
        video_url: formData.video_url,
        thumbnail: thumbnail || getYouTubeThumbnail(formData.video_url),
        duration: currentVideo ? currentVideo.duration : '', // Keep existing duration if editing
        price: 0, // YouTube videos are free
        order: currentVideo ? currentVideo.order : 0, // Keep existing order if editing
        is_active: currentVideo ? (currentVideo.is_active !== undefined ? currentVideo.is_active : true) : true, // Keep existing status if editing
      };

      if (currentVideo) {
        await updateTrainingCourse(currentVideo.id, data);
        toast.success('Video updated successfully');
      } else {
        await createTrainingCourse(data);
        toast.success('Video added successfully');
      }

      setShowModal(false);
      resetForm();
      fetchVideos();
    } catch (error) {
      console.error('Error saving video:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.detail || error.message || 'Failed to save video';
      toast.error(errorMessage);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this video?')) {
      return;
    }
    
    try {
      await deleteTrainingCourse(id);
      toast.success('Video deleted successfully');
      fetchVideos();
    } catch (error) {
      console.error('Error deleting video:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.detail || error.message || 'Failed to delete video';
      toast.error(errorMessage);
    }
  };

  const resetForm = () => {
    setFormData({
      video_url: '',
      thumbnail: '',
    });
    setCurrentVideo(null);
  };

  const editVideo = (video) => {
    setCurrentVideo(video);
    setFormData({
      video_url: video.video_url || '',
      thumbnail: video.thumbnail || '',
    });
    setShowModal(true);
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
        ) : videos.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <FaYoutube className="mx-auto text-4xl mb-4" />
            <p>No YouTube videos found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map(video => (
              <div key={video.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border border-gray-200 dark:border-gray-700">
                <div className="relative h-48">
                  {video.thumbnail ? (
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      <FaYoutube className="text-4xl text-gray-400" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <a
                      href={video.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-white rounded-full text-red-600 hover:text-red-700"
                    >
                      <FaYoutube size={24} />
                    </a>
                  </div>
                  <div className="absolute top-2 right-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      video.is_active 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {video.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                
                <div className="p-4">
                  <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">{video.title}</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">{video.description}</p>
                  
                  {video.duration && (
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                      Duration: {video.duration}
                    </div>
                  )}
                  
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
                        onClick={() => handleDelete(video.id)}
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
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
              {currentVideo ? 'Edit Video' : 'Add New Video'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  YouTube Video URL *
                </label>
                <input
                  type="url"
                  value={formData.video_url}
                  onChange={(e) => {
                    const url = e.target.value;
                    setFormData({...formData, video_url: url});
                    // Auto-generate thumbnail if URL is valid and no custom thumbnail is set
                    if (url && !formData.thumbnail) {
                      const autoThumbnail = getYouTubeThumbnail(url);
                      if (autoThumbnail) {
                        setFormData(prev => ({...prev, thumbnail: autoThumbnail}));
                      }
                    }
                  }}
                  className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                  required
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Paste the full YouTube URL. The thumbnail will be auto-generated from the video.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Custom Thumbnail URL (Optional)
                </label>
                <input
                  type="url"
                  value={formData.thumbnail}
                  onChange={(e) => setFormData({...formData, thumbnail: e.target.value})}
                  className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Leave empty to use YouTube default thumbnail"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  If left empty, the default YouTube thumbnail will be used automatically.
                </p>
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
