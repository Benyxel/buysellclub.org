import React from "react";
import HeroSection from "../components/HeroSection";
import Category from "../components/Category";
import Category2 from "../components/Category2";
import LastestProducts from "../components/LastestProducts";
import ServicesC from "../components/ServicesC";
import Banner from "../components/Banner";
import SupplierBanner from "../components/SupplierBanner";
import bimg1 from "../assets/bimg1.png";
import TrendingP from "../components/TrendingP";

const BannerData = {
  rate: "240$",
  rateLabel: "OUR CBM SHIPPING RATE",
  title: "Fofoofo Imports",
  date: "",
  image: bimg1,
  title2: "Looking for a logistic service?",
  title3: "Fofoofo Imports",

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
      <SupplierBanner />
    </div>
  );
};

export default Home;
