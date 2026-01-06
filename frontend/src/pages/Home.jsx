import React, { useState, useEffect } from "react";
import HeroSection from "../components/HeroSection";
import Category from "../components/Category";
import Category2 from "../components/Category2";
import LastestProducts from "../components/LastestProducts";
import ServicesC from "../components/ServicesC";
import Banner from "../components/Banner";
import SupplierBanner from "../components/SupplierBanner";
import bimg1 from "../assets/bimg1.png";
import TrendingP from "../components/TrendingP";
import LiveChatWidget from "../components/LiveChatWidget";
import ContainerInfoWidget from "../components/ContainerInfoWidget";
import { Api } from "../api";

const Home = () => {
  const [shippingRate, setShippingRate] = useState("240$"); // Default fallback

  useEffect(() => {
    // Fetch the current shipping rate from backend
    const fetchShippingRate = async () => {
      try {
        const response = await Api.shipping.rate();
        if (response.data && response.data.normal_goods_rate) {
          // Format the rate as "$240" format
          const rate = parseFloat(response.data.normal_goods_rate).toFixed(0);
          setShippingRate(`${rate}$`);
        }
      } catch (error) {
        console.error("Failed to fetch shipping rate:", error);
        // Keep default "240$" if fetch fails
      }
    };

    fetchShippingRate();
  }, []);

  const BannerData = {
    rate: shippingRate,
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
      <Category />
      <Category2 />
      <ServicesC />
      <Banner data={BannerData} />
      <LastestProducts />
      <TrendingP />
      <SupplierBanner />
      <LiveChatWidget />
      <ContainerInfoWidget />
    </div>
  );
};

export default Home;
