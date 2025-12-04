import React, { useState, useEffect } from "react";
import { FaVideo, FaPlay, FaSpinner, FaYoutube } from "react-icons/fa";
import { toast } from "react-toastify";
import API from "../../api";

const AgentVideoContent = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      // Fetch training courses - filter for agent tutorials
      const response = await API.get("/buysellapi/training-courses/");
      const allCourses = Array.isArray(response.data) 
        ? response.data 
        : Array.isArray(response.data?.results) 
        ? response.data.results 
        : [];
      
      // Filter for active courses (can add agent-specific filter if needed)
      const activeVideos = allCourses.filter(
        (course) => course.is_active && (course.course_type === "youtube" || course.course_type === "premium")
      );
      
      setVideos(activeVideos);
    } catch (error) {
      console.error("Error fetching videos:", error);
      toast.error("Failed to load video tutorials");
      setVideos([]);
    } finally {
      setLoading(false);
    }
  };

  const getYouTubeEmbedUrl = (url) => {
    if (!url) return null;
    try {
      const videoId = extractYouTubeId(url);
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`;
      }
      return url;
    } catch {
      return url;
    }
  };

  const extractYouTubeId = (url) => {
    if (!url) return null;
    try {
      const urlObj = new URL(url);
      if (urlObj.hostname === "youtu.be") {
        return urlObj.pathname.slice(1);
      }
      return urlObj.searchParams.get("v") || null;
    } catch {
      const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
      return match ? match[1] : null;
    }
  };

  const filteredVideos = videos.filter(
    (video) =>
      video.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      video.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2 mb-2">
          <FaVideo className="text-red-600" />
          Video Tutorials
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Step-by-step video tutorials to help you navigate the agent dashboard
        </p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search videos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
      </div>

      {/* Videos Grid */}
      {loading ? (
        <div className="text-center py-12">
          <FaSpinner className="animate-spin text-4xl text-blue-600 mx-auto" />
        </div>
      ) : filteredVideos.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <FaVideo className="text-6xl text-gray-400 mx-auto mb-4" />
          <p>No video tutorials available yet.</p>
          <p className="text-sm mt-2">Check back later for step-by-step guides.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVideos.map((video) => (
            <div
              key={video.id}
              className="bg-gray-50 dark:bg-gray-700 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setSelectedVideo(video)}
            >
              <div className="relative">
                {video.thumbnail ? (
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-full h-48 object-cover"
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                ) : (
                  <div className="w-full h-48 bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                    <FaYoutube className="text-6xl text-gray-400" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <FaPlay className="text-white text-4xl" />
                </div>
                {video.duration && (
                  <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                    {video.duration}
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-gray-800 dark:text-white mb-2 line-clamp-2">
                  {video.title}
                </h3>
                {video.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
                    {video.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Video Modal */}
      {selectedVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-75">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                  {selectedVideo.title}
                </h3>
                <button
                  onClick={() => setSelectedVideo(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl"
                >
                  ×
                </button>
              </div>
              {selectedVideo.description && (
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {selectedVideo.description}
                </p>
              )}
              <div className="relative pb-[56.25%] h-0 overflow-hidden rounded-lg">
                {selectedVideo.video_url ? (
                  <iframe
                    src={getYouTubeEmbedUrl(selectedVideo.video_url)}
                    title={selectedVideo.title}
                    className="absolute top-0 left-0 w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-gray-200 dark:bg-gray-700">
                    <p className="text-gray-500">Video not available</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentVideoContent;

