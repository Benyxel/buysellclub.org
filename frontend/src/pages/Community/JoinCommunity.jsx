import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaUsers, FaCheckCircle, FaClock, FaTimesCircle, FaQuoteLeft, FaTimes } from "react-icons/fa";
import { toast } from "../../utils/toast";
import { Api } from "../../api";
import comment1 from "../../assets/comments/WhatsApp Image 2026-02-06 at 3.01.03 PM.jpeg";
import comment2 from "../../assets/comments/WhatsApp Image 2026-02-06 at 3.03.51 PM.jpeg";
import comment3 from "../../assets/comments/WhatsApp Image 2026-02-06 at 3.04.42 PM.jpeg";
import comment4 from "../../assets/comments/WhatsApp Image 2026-02-06 at 3.05.06 PM.jpeg";
import comment5 from "../../assets/comments/WhatsApp Image 2026-02-06 at 3.05.39 PM.jpeg";
import comment6 from "../../assets/comments/WhatsApp Image 2026-02-06 at 3.06.08 PM.jpeg";

const COMMENT_IMAGES = [comment1, comment2, comment3, comment4, comment5, comment6];

const statusConfig = {
  pending: {
    label: "Pending approval",
    icon: <FaClock className="text-yellow-600" />,
    badge: "bg-yellow-100 text-yellow-800",
  },
  approved: {
    label: "Approved",
    icon: <FaCheckCircle className="text-green-600" />,
    badge: "bg-green-100 text-green-800",
  },
  rejected: {
    label: "Rejected",
    icon: <FaTimesCircle className="text-red-600" />,
    badge: "bg-red-100 text-red-800",
  },
};

const JoinCommunity = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({
    membership_amount: 0,
    sale_price: 0,
  });
  const [requestInfo, setRequestInfo] = useState(null);
  const [telegramLink, setTelegramLink] = useState("");
  const [memberName, setMemberName] = useState("");
  const [previewImage, setPreviewImage] = useState(null);
  const isLoggedIn = !!(
    typeof window !== "undefined" && localStorage.getItem("token")
  );

  const fetchData = async () => {
    const hasToken = !!(
      typeof window !== "undefined" && localStorage.getItem("token")
    );
    try {
      setLoading(true);
      // Fetch settings (allow failure for guests so page still shows)
      try {
        const settingsResp = await Api.community.settings.get({
          noCache: true,
        });
        setSettings(
          settingsResp.data || { membership_amount: 0, sale_price: 0 }
        );
      } catch (e) {
        console.warn("Community settings not loaded (guest or error):", e);
      }
      // Only fetch my request status when logged in
      if (hasToken) {
        try {
          const requestResp = await Api.community.myRequest({ noCache: true });
          setRequestInfo(requestResp.data?.request || null);
          setTelegramLink(requestResp.data?.telegram_link || "");
        } catch (e) {
          console.warn("Community request not loaded:", e);
          setRequestInfo(null);
          setTelegramLink("");
        }
      } else {
        setRequestInfo(null);
        setTelegramLink("");
      }
    } catch (error) {
      console.error("Failed to load community info:", error);
      if (hasToken) toast.error("Failed to load community information");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const refresh = () => fetchData();
    const handleFocus = () => refresh();
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        refresh();
      }
    });

    const handleStorage = (e) => {
      if (e.key === "communitySettingsUpdatedAt") {
        refresh();
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  useEffect(() => {
    try {
      const userData = JSON.parse(localStorage.getItem("userData") || "{}");
      setMemberName(userData.full_name || userData.username || "");
    } catch {
      setMemberName("");
    }
  }, []);

  const currentStatus = requestInfo?.status;
  const statusMeta = currentStatus ? statusConfig[currentStatus] : null;
  const salePrice = Number(settings.sale_price || 0);
  const basePrice = Number(settings.membership_amount || 0);
  const displayPrice =
    salePrice > 0 && salePrice < basePrice ? salePrice : basePrice;
  const expiresAt = requestInfo?.expires_at
    ? new Date(requestInfo.expires_at).toLocaleDateString()
    : "";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-10 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div style={{ position: "relative", paddingTop: "56.25%" }}>
            <iframe
              src="https://player.mediadelivery.net/embed/589888/bcb76319-6a19-4078-9628-61cc454f0bb0?autoplay=true&loop=true&muted=false&preload=true&responsive=true"
              loading="lazy"
              style={{ border: 0, position: "absolute", top: 0, height: "100%", width: "100%" }}
              allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture;"
              allowFullScreen
              title="Community video"
            />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            What you get inside the community
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            You are not joining a noisy group chat. You’re joining a structured
            community with focused Topics:
          </p>
          <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <li>✅ 🏆 Winning Products</li>
            <li>✅ 📚 Supplier Contacts</li>
            <li>✅ 🛒 Whole Sale Products</li>
            <li>✅ 🎬 Video Tutorials</li>
            <li>✅ ❓ Questions &amp; Answers</li>
            <li>✅ # Member Events</li>
            <li>✅ # General Discussion</li>
          </ul>
        </div>

        {/* Member comments / testimonials */}
        <section className="pt-4 pb-2">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2 text-center">
            What members say
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-8 max-w-xl mx-auto">
            Real feedback from our community
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4 justify-items-center">
            {COMMENT_IMAGES.map((src, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setPreviewImage(src)}
                className="community-comment-card group relative rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 shadow-md hover:shadow-xl transition-all duration-500 ease-out hover:-translate-y-0.5 hover:scale-[1.02] inline-block cursor-pointer text-left"
                style={{
                  animation: "communityFadeUp 0.6s ease-out forwards",
                  opacity: 0,
                  animationDelay: `${i * 80}ms`,
                }}
              >
                <div className="absolute top-2 left-2 z-10 text-green-500/90 text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <FaQuoteLeft />
                </div>
                <img
                  src={src}
                  alt={`Community member feedback ${i + 1}`}
                  className="block max-w-full h-auto align-top transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              </button>
            ))}
          </div>
        </section>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-green-100 text-green-700">
              <FaUsers className="text-xl" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Join Community
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Pay the membership fee and submit proof to join our community.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Membership Fee
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                ₵{displayPrice.toFixed(2)}
              </p>
              {salePrice > 0 && salePrice < basePrice && (
                <p className="text-sm text-gray-500 dark:text-gray-400 line-through">
                  ₵{basePrice.toFixed(2)}
                </p>
              )}
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                Pay using the same payment details shown on the payment page.
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Your Status
              </p>
              {loading ? (
                <p className="text-gray-500 dark:text-gray-400">Loading...</p>
              ) : statusMeta ? (
                <div className="flex items-center gap-2">
                  {statusMeta.icon}
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${statusMeta.badge}`}
                  >
                    {statusMeta.label}
                  </span>
                </div>
              ) : !isLoggedIn ? (
                <p className="text-gray-500 dark:text-gray-400">
                  Sign in to see your status.
                </p>
              ) : (
                <p className="text-gray-500 dark:text-gray-400">
                  No request submitted yet.
                </p>
              )}
            </div>
          </div>
        </div>

        {currentStatus === "approved" && telegramLink ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-green-200 dark:border-green-700">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                You’re approved 🎉
              </h2>
              <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
                Community Member
              </span>
            </div>
            {(requestInfo?.user_full_name || memberName) && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Member: {requestInfo?.user_full_name || memberName}
              </p>
            )}
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              Subscription: Yearly
            </p>
            {expiresAt && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Expires on: {expiresAt}
              </p>
            )}
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Click below to join the community on Telegram.
            </p>
            <a
              href={telegramLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-5 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold"
            >
              Join Telegram Group
            </a>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Submit your payment proof
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Complete payment and upload your proof to request access.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Membership is billed yearly. Your expiration date will be shown
              after approval.
            </p>
            {isLoggedIn ? (
              <Link
                to="/CommunityPayment"
                className="inline-flex items-center px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                Pay & Submit Proof
              </Link>
            ) : (
              <button
                type="button"
                onClick={() =>
                  navigate("/Signup", {
                    state: { redirectTo: "/CommunityPayment" },
                  })
                }
                className="inline-flex items-center px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                Register to join
              </button>
            )}
          </div>
        )}
      </div>

      {/* Image preview modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPreviewImage(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
        >
          <button
            type="button"
            onClick={() => setPreviewImage(null)}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="Close preview"
          >
            <FaTimes className="text-xl" />
          </button>
          <img
            src={previewImage}
            alt="Preview"
            className="max-w-full max-h-[90vh] w-auto h-auto object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <style>{`
        @keyframes communityFadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default JoinCommunity;
