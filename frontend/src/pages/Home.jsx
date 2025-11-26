import React from "react";
import HeroSection from "../components/HeroSection";
import Category from "../components/Category";
import Category2 from "../components/Category2";
import LastestProducts from "../components/LastestProducts";
import ServicesC from "../components/ServicesC";
import Banner from "../components/Banner";
import bimg1 from "../assets/bimg1.png";
import TrendingP from "../components/TrendingP";

const BannerData = {
  rate: "240$",
  rateLabel: "OUR CBM SHIPPING RATE",
  title: "Fine Smile",
  date: "",
  image: bimg1,
  title2: "Air Solo Bass",
  title3: "Fofoofo Imports",
  title4:
    "Fofoofo handles your Buy4Me sourcing, RMB payments, and weekly sea/air shipping under one dashboard.",
  bgColor: "#f42c37",
};

const Home = () => {
  return (
    <div>
      <HeroSection />
      <Category />
      <Category2 />
      <ServicesC />
      <Banner data={BannerData} />
      <LastestProducts />
      <TrendingP />
    </div>
  );
};

export default Home;
