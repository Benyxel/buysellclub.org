import React, { useEffect, useMemo, useState } from "react";
import { FaYoutube } from "react-icons/fa";
import { getTrainingCourses } from "../api";

const extractYouTubeId = (url = "") => {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "youtu.be") {
      return parsed.pathname.slice(1);
    }
    if (parsed.hostname.includes("youtube.com")) {
      return parsed.searchParams.get("v") || "";
    }
  } catch (error) {
    // fallback regex
  }
  const match = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : "";
};

const LatestYouTubeVideos = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchVideos = async () => {
      setLoading(true);
      try {
        const response = await getTrainingCourses();
        const allCourses = response.data || [];
        const youtubeVideos = allCourses
          .filter((course) => course.course_type === "youtube")
          .map((course) => {
            const videoId =
              course.youtube_video_id || extractYouTubeId(course.video_url);
            return {
              id: course.id,
              title: course.title || "YouTube Video",
              videoId,
              created_at:
                course.created_at || course.createdAt || new Date().toISOString(),
            };
          })
          .filter((video) => Boolean(video.videoId))
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setVideos(youtubeVideos);
      } catch (error) {
        console.error("Failed to load YouTube videos:", error);
        setVideos([]);
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, []);

  const latestVideos = useMemo(() => videos.slice(0, 3), [videos]);
  const latestVideo = latestVideos[0];

  if (loading && videos.length === 0) {
    return null;
  }

  if (!latestVideo) {
    return null;
  }

  return (
    <section className="px-4 py-10 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <FaYoutube className="text-red-600 text-2xl" />
          <h3 className="text-2xl font-bold text-gray-800 dark:text-white">
            Latest Videos
          </h3>
        </div>
      </div>

      {/* Desktop: show latest 3 */}
      <div className="hidden md:grid grid-cols-1 lg:grid-cols-3 gap-6">
        {latestVideos.map((video) => (
          <div
            key={video.id}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden"
          >
            <div className="relative pb-[56.25%]">
              <iframe
                className="absolute inset-0 w-full h-full"
                src={`https://www.youtube.com/embed/${video.videoId}`}
                title={video.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <div className="p-4">
              <p className="text-sm font-semibold text-gray-800 dark:text-white">
                {video.title}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Mobile: show latest 1 */}
      <div className="md:hidden mt-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
          <div className="relative pb-[56.25%]">
            <iframe
              className="absolute inset-0 w-full h-full"
              src={`https://www.youtube.com/embed/${latestVideo.videoId}`}
              title={latestVideo.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          <div className="p-4">
            <p className="text-sm font-semibold text-gray-800 dark:text-white">
              {latestVideo.title}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LatestYouTubeVideos;

