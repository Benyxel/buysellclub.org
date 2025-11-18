import React, { useEffect } from "react";
import Slider from "react-slick";
import Button from "./shared/Button";
import OptimizedImage from "./OptimizedImage";
import heroSlide1 from "../assets/HeroS1.png";
import heroSlide2 from "../assets/heros2.png";
import heroSlide3 from "../assets/rmbi.png";
import heroSlide4 from "../assets/store.png";

const HeroData = [
  {
    id: 1,
    src: heroSlide1,
    alt: "Slide 1",
    subtile: "Logisctic Services",
    title: "fofoofo Imports",
    description: "Ship goods from China to Ghana",
  },
  {
    id: 2,
    src: heroSlide2,
    alt: "Slide 2",
    subtile: "Buy for me",
    title: "fofoofo Imports",
    description: "let's buy for you FROM CHINA",
  },
  {
    id: 3,
    src: heroSlide3,
    alt: "Slide 3",
    subtile: "Paying Suppliers",
    title: "fofoofo Imports",
    description: "RMB Trading MADE EASY",
  },
  {
    id: 4,
    src: heroSlide4,
    alt: "Slide 4",
    subtile: "Wholesale-Products",
    title: "BuySellClub",
    description: "Buy Goods at cheaper prices",
  },
];

function HeroSection({ title, description, image }) {
  // Preload first hero image for faster initial render
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = heroSlide1;
    document.head.appendChild(link);
    
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  const settings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplaySpeed: 4000,
    cssEase: "ease-in-out",
    pauseOnFocus: true,
    pauseOnHover: false,
    autoplay: true,
    arrows: false,
  };

  // If props are provided, show single hero section
  if (title && description) {
    return (
      <div className="container">
        <div className="overflow-hidden rounded-3xl min-h-[550px] sm:min-h-[650px] hero-bg-color flex justify-center items-center flex-row">
          <div className="container pb-8 sm:pb-0">
            <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="flex flex-col justify-center gap-4 sm:pl-3 pt-12 sm:pt-0 text-center sm:text-left order-2 sm:order-1 relative z-10">
                <h1 className="text-2xl sm:text-6xl lg:text-2xl font-bold">
                  {title}
                </h1>
                <h1 className="text-5xl uppercase text-[#d6247a] dark:text-white/5 sm:text-[80px] md:text-[100px]xl:text-[150px] font-bold">
                  {description}
                </h1>
                <div>
                  <Button
                    text="Shop Now"
                    bgColor="bg-primary"
                    textColor="text-white"
                  />
                </div>
              </div>
              <div className="order-1 sm:order-2">
                <div className="flex justify-center">
                  <OptimizedImage
                    src={image || HeroData[0].src}
                    alt={title}
                    className="w-[300px] h-[300px] sm:h-[550px] sm:w-[400px] sm:scale-105 lg:scale-110 object-contain mx-auto drop-shadow-[-8px_4px_6px_rgba(0,0,0,.4)] relative z-40"
                    preload={true}
                    loading="eager"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default slider behavior
  return (
    <div className="container">
      <div className="overflow-hidden rounded-3xl min-h-[550px] sm:min-h-[650px] hero-bg-color flex justify-center items-center flex-row">
        <div className="container pb-8 sm:pb-0">
          <Slider {...settings}>
            {HeroData.map((data) => (
              <div key={data.id}>
                <div className="grid grid-cols-1 md:grid-cols-2">
                  <div className="flex flex-col justify-center gap-4 sm:pl-3 pt-12 sm:pt-0 text-center sm:text-left order-2 sm:order-1 relative z-10">
                    <h1 className="text-2xl sm:text-6xl lg:text-2xl font-bold">
                      {data.subtile}
                    </h1>
                    <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold">
                      {data.title}
                    </h1>
                    <h1 className="text-5xl uppercase text-[#d6247a] dark:text-white/5 sm:text-[80px] md:text-[100px]xl:text-[150px] font-bold">
                      {data.description}
                    </h1>
                    <div>
                      <Button
                        text="Shop Now"
                        bgColor="bg-primary"
                        textColor="text-white"
                      />
                    </div>
                  </div>
                  <div className="order-1 sm:order-2">
                    <div className="flex justify-center">
                      <OptimizedImage
                        src={data.src}
                        alt={data.alt}
                        className="w-[300px] h-[300px] sm:h-[550px] sm:w-[400px] sm:scale-105 lg:scale-110 object-contain mx-auto drop-shadow-[-8px_4px_6px_rgba(0,0,0,.4)] relative z-40"
                        preload={data.id === 1}
                        loading={data.id === 1 ? "eager" : "lazy"}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </Slider>
        </div>
      </div>
    </div>
  );
}

export default HeroSection;
