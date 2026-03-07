import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
    subtile: "Logistic Services",
    title: "Fofoofo Imports",
    description: "Ship goods from China to Ghana",
  },
  {
    id: 2,
    src: heroSlide2,
    alt: "Slide 2",
    subtile: "Buy for me",
    title: "BuySellClub",
    description: "let's buy for you FROM CHINA",
  },
  {
    id: 3,
    src: heroSlide3,
    alt: "Slide 3",
    subtile: "Paying Suppliers",
    title: "BuySellClub",
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

export default function HeroSection({ title, description, image }) {
  // Preload first hero image for faster initial render
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    // Preload the first hero image (HeroS1.png)
    link.href = HeroData[0].src;
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

  // Ghana flag ribbon – full width top (left to right), flowing waves, animated
  const GhanaFlagRibbon = () => {
    const [phase, setPhase] = useState(0);
    const W = 600;
    const H = 52;
    const stripeH = H / 3;
    const amp = 3;
    const wave = (x, basePhase) => amp * Math.sin((x / 40) + basePhase + phase);
    const wavePath = (y0, y1, phaseTop, phaseBottom) => {
      let d = `M 0,${y0 + wave(0, phaseTop)}`;
      for (let x = 4; x <= W; x += 8) {
        d += ` L ${x},${y0 + wave(x, phaseTop)}`;
      }
      d += ` L ${W},${y1 + wave(W, phaseBottom)}`;
      for (let x = W - 4; x >= 0; x -= 8) {
        d += ` L ${x},${y1 + wave(x, phaseBottom)}`;
      }
      return d + " Z";
    };
    useEffect(() => {
      let rafId;
      const start = performance.now();
      const tick = (now) => {
        setPhase((now - start) * 0.0015);
        rafId = requestAnimationFrame(tick);
      };
      rafId = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(rafId);
    }, []);
    return (
      <div
        className="absolute top-0 left-0 right-0 z-20 w-full h-14 sm:h-16 overflow-hidden rounded-t-3xl pointer-events-none"
        aria-hidden
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-full block"
          preserveAspectRatio="none"
        >
          <defs>
            <filter id="ghana-ribbon-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.3" floodColor="#000" />
            </filter>
            <linearGradient id="red-shade" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#e82332" />
              <stop offset="100%" stopColor="#b50e1a" />
            </linearGradient>
            <linearGradient id="gold-shade" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffe04d" />
              <stop offset="100%" stopColor="#e6b800" />
            </linearGradient>
            <linearGradient id="green-shade" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#008c4a" />
              <stop offset="100%" stopColor="#004d28" />
            </linearGradient>
          </defs>
          <g filter="url(#ghana-ribbon-shadow)">
            <path d={wavePath(1, stripeH - 1, 0, 0.4)} fill="url(#red-shade)" />
            <path d={wavePath(stripeH, 2 * stripeH - 1, 0.3, 0.7)} fill="url(#gold-shade)" />
            <path d={wavePath(2 * stripeH, H - 1, 0.6, 1)} fill="url(#green-shade)" />
            <text x={W / 2} y={stripeH * 1.5 + 2} textAnchor="middle" fill="#000" fontSize="14" fontWeight="bold">★</text>
          </g>
        </svg>
      </div>
    );
  };

  // If props are provided, show single hero section
  if (title && description) {
    return (
      <div className="container">
        <div className="relative overflow-hidden rounded-3xl min-h-[550px] sm:min-h-[650px] hero-bg-color flex justify-center items-center flex-row">
          <GhanaFlagRibbon />
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
                  <Link to="/Shop">
                    <Button
                      text="Shop Now"
                      bgColor="bg-primary"
                      textColor="text-white"
                    />
                  </Link>
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
      <div className="relative overflow-hidden rounded-3xl min-h-[550px] sm:min-h-[650px] hero-bg-color flex justify-center items-center flex-row">
        <GhanaFlagRibbon />
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
                      <Link to="/Shop">
                        <Button
                          text="Shop Now"
                          bgColor="bg-primary"
                          textColor="text-white"
                        />
                      </Link>
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
