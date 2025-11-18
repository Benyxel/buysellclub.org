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
  rate: "200$",
  title: "Fine Smile",
  date: "10 jan to jan",
  image: bimg1,
  title2: "Air Solo Bass",
  title3: "Winter Sale",
  title4:
    "fofoofo import shipping is on sales at it best fofoofo import shipping is on sales at it best",
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
