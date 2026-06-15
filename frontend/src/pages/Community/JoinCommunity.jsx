import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FaQuoteLeft, FaTimes } from "react-icons/fa";
import { toast } from "../../utils/toast";
import { Api } from "../../api";
import comment1 from "../../assets/comments/WhatsApp Image 2026-02-06 at 3.01.03 PM.jpeg";
import comment2 from "../../assets/comments/WhatsApp Image 2026-02-06 at 3.03.51 PM.jpeg";
import comment3 from "../../assets/comments/WhatsApp Image 2026-02-06 at 3.04.42 PM.jpeg";
import comment4 from "../../assets/comments/WhatsApp Image 2026-02-06 at 3.05.06 PM.jpeg";
import comment5 from "../../assets/comments/WhatsApp Image 2026-02-06 at 3.05.39 PM.jpeg";
import comment6 from "../../assets/comments/WhatsApp Image 2026-02-06 at 3.06.08 PM.jpeg";
import CommunityExecutiveUpgrade from "../../components/Community/CommunityExecutiveUpgrade";
import MembershipPricingSection from "../../components/membership/MembershipPricingSection";

const COMMENT_IMAGES = [comment1, comment2, comment3, comment4, comment5, comment6];

const JoinCommunity = () => {
  const [loading, setLoading] = useState(true);
  const [priceJumpCountdown, setPriceJumpCountdown] = useState("");
  const [settings, setSettings] = useState({
    membership_amount: 0,
    sale_price: 0,
    sheet_only_price: 0,
    has_sheet_product: false,
  });
  const [requestInfo, setRequestInfo] = useState(null);
  const [sheetAccessType, setSheetAccessType] = useState(null);
  const [memberName, setMemberName] = useState("");
  const [previewImage, setPreviewImage] = useState(null);
  const [executiveSettings, setExecutiveSettings] = useState({});
  const [executiveAmount, setExecutiveAmount] = useState(0);
  const [executiveBaseAmount, setExecutiveBaseAmount] = useState(0);
  const [isExecutiveMember, setIsExecutiveMember] = useState(false);
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
        const settingsResp = await Api.community.settings.get();
        const d = settingsResp.data || {};
        setSettings({
          membership_amount: d.membership_amount ?? 0,
          sale_price: d.sale_price ?? 0,
          sheet_only_price: d.sheet_only_price ?? 0,
          sheet_only_label: d.sheet_only_label || "Suppliers only",
          has_sheet_product: !!d.has_sheet_product,
        });
      } catch (e) {
        console.warn("Community settings not loaded (guest or error):", e);
      }
      try {
        const executiveResp = await Api.executive.settings.get();
        const exec = executiveResp.data || {};
        const execBase = Number(exec.membership_amount || 0);
        const execSale = Number(exec.sale_price || 0);
        setExecutiveSettings(exec);
        setExecutiveBaseAmount(execBase);
        setExecutiveAmount(
          execSale > 0 && execSale < execBase ? execSale : execBase
        );
      } catch (e) {
        console.warn("Executive settings not loaded:", e);
      }
      // Only fetch my request status when logged in
      if (hasToken) {
        try {
          const requestResp = await Api.community.myRequest();
          setRequestInfo(requestResp.data?.request || null);
          setSheetAccessType(requestResp.data?.sheet_access_type || null);
        } catch (e) {
          console.warn("Community request not loaded:", e);
          setRequestInfo(null);
          setSheetAccessType(null);
        }
        try {
          const executiveReq = await Api.executive.myRequest();
          setIsExecutiveMember(Boolean(executiveReq.data?.is_executive_member));
        } catch (e) {
          setIsExecutiveMember(false);
        }
      } else {
        setRequestInfo(null);
        setSheetAccessType(null);
        setIsExecutiveMember(false);
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
    const STORAGE_KEY = "communityPriceJumpCycleStartMs_1h";
    const CYCLE_MS = 60 * 60 * 1000; // 1 hour

    const getStartMs = () => {
      const raw = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
      const parsed = raw ? Number(raw) : NaN;
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
      const now = Date.now();
      try {
        localStorage.setItem(STORAGE_KEY, String(now));
      } catch {
        // ignore storage failures
      }
      return now;
    };

    let startMs = getStartMs();

    const formatRemaining = (ms) => {
      const totalSeconds = Math.max(0, Math.floor(ms / 1000));
      const h = Math.floor(totalSeconds / 3600);
      const m = Math.floor((totalSeconds % 3600) / 60);
      const s = totalSeconds % 60;
      const pad = (n) => String(n).padStart(2, "0");
      return `${pad(h)}:${pad(m)}:${pad(s)}`;
    };

    const tick = () => {
      const now = Date.now();
      const elapsed = now - startMs;
      const inCycle = ((elapsed % CYCLE_MS) + CYCLE_MS) % CYCLE_MS;
      const remaining = CYCLE_MS - inCycle;

      // When we hit the end of cycle, reset start time to keep a clean loop.
      if (remaining <= 1000) {
        startMs = now;
        try {
          localStorage.setItem(STORAGE_KEY, String(startMs));
        } catch {
          // ignore storage failures
        }
      }

      setPriceJumpCountdown(formatRemaining(remaining));
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
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
  const salePrice = Number(settings.sale_price || 0);
  const basePrice = Number(settings.membership_amount || 0);
  const displayPrice =
    salePrice > 0 && salePrice < basePrice ? salePrice : basePrice;
  const isApprovedMember =
    currentStatus === "approved" || sheetAccessType === "member";
  const expiresAt = requestInfo?.expires_at
    ? new Date(requestInfo.expires_at).toLocaleDateString()
    : "";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-10 px-4">
      <div className="max-w-6xl mx-auto space-y-10">
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

        <MembershipPricingSection
          communityAmount={displayPrice}
          communityBaseAmount={basePrice}
          executiveAmount={executiveAmount}
          executiveBaseAmount={executiveBaseAmount}
          executiveSettings={executiveSettings}
          isLoggedIn={isLoggedIn}
          isCommunityMember={isApprovedMember}
          isExecutiveMember={isExecutiveMember}
          communityRequestStatus={currentStatus}
          loading={loading}
          priceJumpCountdown={priceJumpCountdown}
        />

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

        {(isApprovedMember || (sheetAccessType === "sheet_only" && isLoggedIn)) ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-green-200 dark:border-green-700">
            {isApprovedMember ? (
              <>
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
              </>
            ) : null}
            {isApprovedMember ? (
              <div className={sheetAccessType === "sheet_only" && isLoggedIn ? "mt-4" : ""}>
                <CommunityExecutiveUpgrade isCommunityMember={isApprovedMember} />
              </div>
            ) : null}
            {sheetAccessType === "sheet_only" && isLoggedIn && (
              <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Want to join the full community? Become a member for full access.
                </p>
                <Link
                  to="/CommunityPayment"
                  className="inline-flex items-center px-5 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold"
                >
                  Become a member (₵{displayPrice.toFixed(2)} yearly)
                </Link>
              </div>
            )}
          </div>
        ) : null}
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
