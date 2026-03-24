import React, { useEffect, useState, useCallback } from "react";
import { FaVideo, FaSpinner, FaHeart, FaRegHeart, FaEye, FaArrowLeft } from "react-icons/fa";
import { Link } from "react-router-dom";
import { toast } from "../../utils/toast";
import { Api } from "../../api";
import { getCachedData } from "../../utils/apiCache";

/** Build iframe src with autoplay disabled for common embed URLs (e.g. YouTube). */
function embedUrlNoAutoplay(url) {
  if (!url) return url;
  try {
    const u = new URL(url);
    u.searchParams.set("autoplay", "0");
    return u.toString();
  } catch {
    return url;
  }
}

const PAGE_SIZE = 50;

const WinningProducts = () => {
  const [loading, setLoading] = useState(() => {
    try {
      const cachedReq = getCachedData("/buysellapi/community/requests/me/");
      const cachedList = getCachedData("/buysellapi/community/winning-products/");
      return !(cachedReq && cachedList);
    } catch {
      return true;
    }
  });
  const [isMember, setIsMember] = useState(false);
  const [items, setItems] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedDescriptionId, setExpandedDescriptionId] = useState(null);
  const [likingId, setLikingId] = useState(null);

  const recordView = useCallback((id) => {
    const key = `wp_view_${id}`;
    try {
      if (typeof sessionStorage !== "undefined" && !sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        Api.communityContent.winningProducts.recordView(id).then((res) => {
          const count = res?.data?.view_count;
          if (typeof count === "number") {
            setItems((prev) =>
              prev.map((i) => (i.id === id ? { ...i, view_count: count } : i))
            );
          }
        }).catch(() => {});
      }
    } catch (_) {}
  }, []);

  const handleLike = async (item) => {
    if (likingId) return;
    setLikingId(item.id);
    try {
      const isLiked = item.liked;
      const res = isLiked
        ? await Api.communityContent.winningProducts.unlike(item.id)
        : await Api.communityContent.winningProducts.like(item.id);
      const data = res?.data || {};
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? {
                ...i,
                liked: data.liked ?? !isLiked,
                like_count: data.like_count ?? (i.like_count || 0) + (isLiked ? -1 : 1),
              }
            : i
        )
      );
    } catch (err) {
      if (err.response?.status === 401) {
        toast.error("Please log in to like videos.");
      } else {
        toast.error("Could not update like. Try again.");
      }
    } finally {
      setLikingId(null);
    }
  };

  useEffect(() => {
    // Hydrate instantly from cache (avoids spinner on revisits)
    try {
      const cachedReq = getCachedData("/buysellapi/community/requests/me/");
      const cachedList = getCachedData("/buysellapi/community/winning-products/");
      const reqData = cachedReq?.data;
      if (reqData) {
        const status = reqData?.request?.status;
        const sheetType = reqData?.sheet_access_type;
        const telegramLink = reqData?.telegram_link || "";
        const approved =
          status === "approved" || (sheetType === "member" && !!telegramLink);
        setIsMember(!!approved);
      }
      const listData = cachedList?.data;
      if (listData) {
        setItems(Array.isArray(listData) ? listData : listData?.results || []);
      }
    } catch {}

    const load = async () => {
      try {
        const resp = await Api.community.myRequest();
        const status = resp.data?.request?.status;
        const sheetType = resp.data?.sheet_access_type;
        const telegramLink = resp.data?.telegram_link || "";
        const approved =
          status === "approved" ||
          (sheetType === "member" && !!telegramLink);
        if (!approved) {
          setIsMember(false);
          return;
        }
        setIsMember(true);
        try {
          const { data } = await Api.communityContent.winningProducts.list();
          setItems(Array.isArray(data) ? data : data?.results || []);
        } catch (err2) {
          console.error("Failed to load winning products list:", err2);
          if (err2.response?.status === 404) {
            setItems([]);
          } else {
            toast.error(
              "Failed to load winning products. Please try again or contact support."
            );
          }
        }
      } catch (err) {
        console.error("Failed to load winning products:", err);
        setIsMember(false);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [items.length]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <FaSpinner className="animate-spin text-3xl text-primary" />
      </div>
    );
  }

  if (!isMember) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 text-center">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Community members only
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Join the community to access our curated winning product videos.
          </p>
          <Link
            to="/Community"
            className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90"
          >
            Go to Community page
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 px-4 py-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <Link
          to="/Profile?tab=community"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary mb-2"
        >
          <FaArrowLeft className="text-xs" />
          Back to Profile · Community
        </Link>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <FaVideo className="text-primary" />
              Winning Products
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Hand‑picked videos of products that are performing well in the
              market.
            </p>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-dashed border-gray-300 dark:border-gray-700 p-8 text-center">
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              No winning product videos have been published yet. Please check
              back later.
            </p>
          </div>
        ) : (
          <>
          <div className="grid gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
            {items
              .slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
              .map((item) => (
              <article
                key={item.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col max-w-md mx-auto md:max-w-none"
              >
                {item.video_url && (
                  <div className="aspect-video max-h-44 sm:max-h-52 bg-black relative shrink-0">
                    <iframe
                      src={embedUrlNoAutoplay(item.embed_url || item.video_url)}
                      onLoad={() => recordView(item.id)}
                      title={item.title || "Winning product video"}
                      className="w-full h-full"
                      frameBorder="0"
                      allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                )}
                <div className="p-3 sm:p-4 flex-1 flex flex-col min-w-0">
                  <h2 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white mb-1 line-clamp-2">
                    {item.title || "Untitled winning product"}
                  </h2>
                  {item.description && (
                    <div className="mb-2">
                      <p
                        className={`text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap ${
                          expandedDescriptionId === item.id
                            ? "max-h-32 overflow-y-auto"
                            : "line-clamp-2"
                        }`}
                      >
                        {item.description}
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedDescriptionId((prev) =>
                            prev === item.id ? null : item.id
                          )
                        }
                        className="text-xs font-medium text-primary hover:underline mt-1"
                      >
                        {expandedDescriptionId === item.id
                          ? "Show less"
                          : "Read more"}
                      </button>
                    </div>
                  )}
                  <div className="mt-auto flex items-center justify-end gap-4 pt-2 border-t border-gray-200 dark:border-gray-600">
                    <span className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                      <FaEye className="text-gray-500 dark:text-gray-400" />
                      <span>{item.view_count ?? 0} view{(item.view_count ?? 0) !== 1 ? "s" : ""}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleLike(item)}
                      disabled={likingId === item.id}
                      className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-primary disabled:opacity-50"
                      aria-label={item.liked ? "Unlike" : "Like"}
                    >
                      {item.liked ? (
                        <FaHeart className="text-primary" />
                      ) : (
                        <FaRegHeart className="text-gray-500 dark:text-gray-400" />
                      )}
                      <span>{item.like_count ?? 0} like{(item.like_count ?? 0) !== 1 ? "s" : ""}</span>
                    </button>
                  </div>
                  {(item.platform || item.moq || item.product_link) && (
                    <div className="space-y-1">
                      {item.platform && (
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                          Platform: <span className="text-gray-700 dark:text-gray-300">{item.platform}</span>
                        </p>
                      )}
                      {item.moq && (
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                          MOQ: <span className="text-gray-700 dark:text-gray-300">{item.moq}</span>
                        </p>
                      )}
                      {item.product_link && (
                        <a
                          href={item.product_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                        >
                          View product
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
          {Math.ceil(items.length / PAGE_SIZE) > 1 && (
            <div className="flex items-center justify-center gap-4 pt-6">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Page {currentPage} of {Math.ceil(items.length / PAGE_SIZE)}
              </span>
              <button
                type="button"
                onClick={() =>
                  setCurrentPage((p) =>
                    Math.min(Math.ceil(items.length / PAGE_SIZE), p + 1)
                  )
                }
                disabled={currentPage >= Math.ceil(items.length / PAGE_SIZE)}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Next
              </button>
            </div>
          )}
          </>
        )}
      </div>
    </div>
  );
};

export default WinningProducts;

