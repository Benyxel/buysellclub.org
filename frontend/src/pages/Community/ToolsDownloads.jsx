import React, { useEffect, useState } from "react";
import { FaDownload, FaSpinner, FaFileAlt, FaArrowLeft } from "react-icons/fa";
import { Link } from "react-router-dom";
import { toast } from "../../utils/toast";
import { Api } from "../../api";

const PAGE_SIZE = 10;

const ToolsDownloads = () => {
  const [loading, setLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);
  const [items, setItems] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const load = async () => {
      try {
        const resp = await Api.community.myRequest({ noCache: true });
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
          const { data } = await Api.communityContent.resources.list();
          setItems(Array.isArray(data) ? data : data?.results || []);
        } catch (err2) {
          console.error("Failed to load tools list:", err2);
          if (err2.response?.status === 404) {
            setItems([]);
          } else {
            toast.error(
              "Failed to load tools & downloads. Please try again or contact support."
            );
          }
        }
      } catch (err) {
        console.error("Failed to load tools:", err);
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
            Join the community to access private tools, templates and download
            files.
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
              <FaDownload className="text-primary" />
              Tools &amp; Downloads
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Spreadsheets, checklists and resources shared exclusively with
              community members.
            </p>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-dashed border-gray-300 dark:border-gray-700 p-8 text-center">
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              No tools have been published yet. Please check back later.
            </p>
          </div>
        ) : (
          <>
          <div className="space-y-3">
            {items
              .slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
              .map((item) => (
              <article
                key={item.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 flex flex-wrap items-center gap-4"
              >
                <div className="flex items-center gap-3 flex-1 min-w-[200px]">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <FaFileAlt />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
                      {item.title || item.filename || "Unnamed resource"}
                    </h2>
                    {item.description && (
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                        {item.description}
                      </p>
                    )}
                    {(item.file_type || item.category) && (
                      <p className="text-2xs text-gray-500 dark:text-gray-400 mt-1">
                        {[item.file_type, item.category].filter(Boolean).join(" • ")}
                      </p>
                    )}
                  </div>
                </div>
                {(item.download_url || item.url) && (
                  <a
                    href={item.download_url || item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-xs sm:text-sm font-semibold hover:bg-primary/90"
                  >
                    <FaDownload className="w-4 h-4" />
                    Download
                  </a>
                )}
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

export default ToolsDownloads;

