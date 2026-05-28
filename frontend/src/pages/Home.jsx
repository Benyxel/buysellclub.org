import React, { Suspense, lazy, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import HeroSection from "../components/HeroSection";
import Banner from "../components/Banner";
import bimg1 from "../assets/bimg1.png";
import { Api } from "../api";

const Event = lazy(() => import("../components/Event"));
const Category = lazy(() => import("../components/Category"));
const Category2 = lazy(() => import("../components/Category2"));
const ServicesC = lazy(() => import("../components/ServicesC"));
const LastestProducts = lazy(() => import("../components/LastestProducts"));
const TrendingP = lazy(() => import("../components/TrendingP"));
const LatestYouTubeVideos = lazy(() => import("../components/LatestYouTubeVideos"));
const SupplierBanner = lazy(() => import("../components/SupplierBanner"));
const ContainerInfoWidget = lazy(() => import("../components/ContainerInfoWidget"));
const ContainerShipmentWidget = lazy(() => import("../components/ContainerShipmentWidget"));
const SupportWidget = lazy(() => import("../components/SupportWidget"));
const DeliveryRequestWidget = lazy(() => import("../components/DeliveryRequestWidget"));
const HomeWidgetsHub = lazy(() => import("../components/HomeWidgetsHub"));

const BelowFoldFallback = () => (
  <div className="min-h-[120px] w-full" aria-hidden />
);

const Home = () => {
  const [shippingRate, setShippingRate] = useState("240$");
  const [specialRate, setSpecialRate] = useState("300$");
  const [dueInvoice, setDueInvoice] = useState(null);
  const [showDueReminder, setShowDueReminder] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const applyRates = (response) => {
      if (!response?.data || cancelled) return;
      if (response.data.normal_goods_rate != null) {
        const rate = parseFloat(response.data.normal_goods_rate).toFixed(0);
        setShippingRate(`${rate}$`);
      }
      if (response.data.special_goods_rate != null) {
        const rate = parseFloat(response.data.special_goods_rate).toFixed(0);
        setSpecialRate(`${rate}$`);
      }
    };

    const load = async () => {
      try {
        const response = await Api.shipping.adRate();
        applyRates(response);
      } catch (error) {
        console.error("Failed to fetch shipping rate:", error);
      }
    };

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const id = window.requestIdleCallback(() => load(), { timeout: 2500 });
      return () => {
        cancelled = true;
        window.cancelIdleCallback(id);
      };
    }
    if (typeof window === "undefined") {
      return () => {
        cancelled = true;
      };
    }
    const t = window.setTimeout(load, 150);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let hideTimer = null;

    const normalizeMark = (raw) => {
      const s = String(raw || "");
      const idx = s.indexOf(":");
      return idx === -1 ? s : s.slice(0, idx).trim();
    };

    const isDue = (inv) => {
      const status = String(inv?.status || "").toLowerCase();
      if (status === "paid" || status === "cancelled" || status === "draft") return false;
      if (!inv?.due_date) return false;
      const due = new Date(inv.due_date);
      const today = new Date(new Date().toDateString());
      return due < today;
    };

    const loadDueInvoice = async () => {
      try {
        const res = await Api.invoices.meList();
        const list = res?.data?.results || [];
        const firstDue = list.find(isDue) || null;
        if (cancelled) return;
        if (firstDue) {
          setDueInvoice(firstDue);
          setShowDueReminder(true);
          hideTimer = window.setTimeout(() => {
            setShowDueReminder(false);
          }, 10000);
        } else {
          setDueInvoice(null);
          setShowDueReminder(false);
        }
      } catch {
        if (!cancelled) {
          setDueInvoice(null);
          setShowDueReminder(false);
        }
      }
    };

    // Light fetch after page becomes interactive.
    const t = window.setTimeout(loadDueInvoice, 800);

    return () => {
      cancelled = true;
      window.clearTimeout(t);
      if (hideTimer) window.clearTimeout(hideTimer);
    };
  }, []);

  const BannerData = {
    rate: `Normal ${shippingRate}/CBM`,
    rateSecondary: `Special ${specialRate}/CBM`,
    rateLabel: "OUR CBM SHIPPING RATE",
    title: "Fofoofo Imports",
    date: "",
    image: bimg1,
    title2: "Looking for a logistic service?",
    title3: "Fofoofo Imports",
    bgColor: "#f42c37",
  };

  return (
    <div>
      <HeroSection />
      <Suspense fallback={<BelowFoldFallback />}>
        <Event />
        <Category />
        <Category2 />
        <ServicesC />
      </Suspense>
      <Banner data={BannerData} />
      <Suspense fallback={<BelowFoldFallback />}>
        <LastestProducts />
        <TrendingP />
        <LatestYouTubeVideos />
        <SupplierBanner />
        <HomeWidgetsHub />
        <ContainerShipmentWidget />
        <ContainerInfoWidget />
        <DeliveryRequestWidget />
        <SupportWidget
          whatsappPhone="+233540266839"
          whatsappLabel="WhatsApp"
          chatLabel="Chat with us"
        />
      </Suspense>

      {/* Due invoice reminder slide card */}
      <div
        className={[
          "fixed left-0 right-0 bottom-0 z-[9999] px-4 pb-4 pointer-events-none",
          showDueReminder ? "" : "",
        ].join(" ")}
      >
        <div
          className={[
            "mx-auto max-w-xl pointer-events-auto",
            "transform transition-all duration-300 ease-out",
            showDueReminder ? "translate-y-0 opacity-100" : "translate-y-24 opacity-0",
          ].join(" ")}
          role="status"
          aria-live="polite"
        >
          {dueInvoice ? (
            <div className="rounded-2xl border border-red-200 dark:border-red-900/50 bg-white dark:bg-gray-900 shadow-xl overflow-hidden">
              <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-extrabold text-red-700 dark:text-red-200">
                    Shipping invoice is due
                  </div>
                  <div className="text-xs text-red-700/80 dark:text-red-200/80">
                    Please pay your shipping fee to avoid more daily storage charges.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDueReminder(false)}
                  className="text-red-700 dark:text-red-200 text-sm font-bold px-2 py-1 rounded hover:bg-red-100/70 dark:hover:bg-red-900/30"
                  aria-label="Dismiss reminder"
                >
                  ×
                </button>
              </div>

              <div className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {dueInvoice.invoice_number || "Invoice"}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">
                      Due date:{" "}
                      {dueInvoice.due_date
                        ? new Date(dueInvoice.due_date).toLocaleDateString("en-GB", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        : "—"}
                    </div>
                    {dueInvoice.storage_fee_detail ? (
                      <div className="text-xs text-gray-700 dark:text-gray-200 mt-2">
                        Storage: {dueInvoice.storage_fee_detail}
                      </div>
                    ) : null}
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Amount (GHS)
                    </div>
                    <div className="text-lg font-extrabold text-gray-900 dark:text-white">
                      GH₵
                      {Number.parseFloat(
                        dueInvoice.amount_due_ghs ?? dueInvoice.total_amount_ghs ?? 0
                      ).toFixed(2)}
                    </div>
                    {Number.parseFloat(dueInvoice.storage_fee_ghs || 0) > 0 ? (
                      <div className="text-xs text-gray-600 dark:text-gray-300">
                        Includes storage: GH₵
                        {Number.parseFloat(dueInvoice.storage_fee_ghs || 0).toFixed(2)}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-end gap-2">
                  <Link
                    to={`/invoice?invoice_number=${encodeURIComponent(
                      dueInvoice.invoice_number || ""
                    )}&mark_id=${encodeURIComponent(
                      (() => {
                        const raw = dueInvoice.shipping_mark || "";
                        const idx = String(raw).indexOf(":");
                        return idx === -1 ? raw : String(raw).slice(0, idx).trim();
                      })()
                    )}`}
                    className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-primary text-white font-bold text-sm hover:opacity-95"
                  >
                    View & Pay
                  </Link>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default Home;
