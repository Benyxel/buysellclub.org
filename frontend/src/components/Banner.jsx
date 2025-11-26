import React from "react";
import { FaCheckCircle, FaArrowRight } from "react-icons/fa";
import { Link } from "react-router-dom";

const defaultHighlights = [
  {
    title: "Sea & Air Shipping",
    description: "Weekly consolidations with live tracking.",
  },
  {
    title: "Buy4Me Concierge",
    description: "We source, inspect and pay suppliers for you.",
  },
  {
    title: "RMB / Alipay Funding",
    description: "Instant wallet top-ups at the live rate.",
  },
];

const Banner = ({ data }) => {
  const highlights =
    Array.isArray(data.highlights) && data.highlights.length > 0 ? data.highlights : defaultHighlights;
  const rateLabel = data.rateLabel || "Today’s Exchange Rate";

  return (
    <div className="min-h-[550px] flex justify-center items-center py-12">
      <div className="container">
        <div
          style={{ backgroundColor: data.bgColor }}
          className="grid grid-cols-1 md:grid-cols-[1.1fr_1fr_1.3fr] gap-6 items-stretch text-white rounded-2xl overflow-hidden shadow-xl"
        >
          {/* Rate highlight */}
          <div className="p-6 sm:p-10 flex flex-col h-full gap-6">
            <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-5 w-fit shadow-inner border border-white/20">
              <p className="uppercase tracking-[0.3em] text-xs text-white/70">{rateLabel}</p>
              <p className="text-4xl sm:text-5xl font-black tracking-tight">{data.rate}</p>
              <p className="text-white/70 text-sm">{data.date}</p>
            </div>
            <div className="space-y-3">
              <h1 className="uppercase text-4xl lg:text-6xl font-extrabold leading-tight">{data.title}</h1>
              <p className="text-white/85 text-base max-w-md">{data.title4}</p>
            </div>
            <Link
              to="/Shipping"
              className="inline-flex items-center gap-2 bg-white text-primary rounded-full py-3 px-6 font-semibold hover:translate-y-0.5 transition-transform shadow-lg mt-auto"
            >
              Start Shipping
              <FaArrowRight />
            </Link>
          </div>

          {/* Product image */}
          <div className="h-full flex items-end justify-center pb-6 md:pb-10 relative overflow-hidden">
            <img
              src={data.image}
              alt=""
              className="scale-110 w-[260px] sm:w-[380px] md:w-[320px] mx-auto drop-shadow-2xl object-cover"
              style={{
                WebkitMaskImage:
                  "linear-gradient(0deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.2) 10%, rgba(0,0,0,0.6) 35%, rgba(0,0,0,1) 60%, rgba(0,0,0,1) 100%)",
                maskImage:
                  "linear-gradient(0deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.2) 10%, rgba(0,0,0,0.6) 35%, rgba(0,0,0,1) 60%, rgba(0,0,0,1) 100%)",
              }}
            />
            <div
              className="absolute inset-x-0 bottom-0 h-24 pointer-events-none"
              style={{ background: `linear-gradient(0deg, ${data.bgColor} 0%, rgba(0,0,0,0))` }}
            ></div>
          </div>

          {/* Service adverts */}
          <div className="flex flex-col justify-center gap-5 p-6 sm:p-10 bg-white/10 backdrop-blur-sm">
            <p className="text-xs uppercase tracking-[0.3em] text-white/70">{data.title2}</p>
            <h2 className="text-3xl sm:text-5xl font-bold tracking-wide mb-2">{data.title3}</h2>
            <div className="space-y-4">
              {highlights.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <span className="mt-1 text-primary bg-white rounded-full p-1 shadow">
                    <FaCheckCircle className="text-lg" />
                  </span>
                  <div>
                    <p className="font-semibold">{item.title}</p>
                    <p className="text-sm text-white/80">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Banner;
