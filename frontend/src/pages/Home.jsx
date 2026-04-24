import React, { Suspense, lazy, useState, useEffect } from "react";
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
    </div>
  );
};

export default Home;
