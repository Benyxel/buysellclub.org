import React from "react";
import { Link } from "react-router-dom";
import valImg from "../assets/val.png";

const ValentineWish = () => {
  return (
    <section
      className="relative overflow-hidden min-h-[140px] sm:min-h-[160px] md:min-h-[180px] flex flex-col sm:flex-row sm:items-stretch"
      aria-label="Valentine's Day wish"
    >
      {/* Left: image fills the left side of the section */}
      <div className="relative w-full sm:w-2/5 md:w-[38%] min-h-[100px] sm:min-h-[160px] md:min-h-[180px] flex-shrink-0 order-first">
        <img
          src={valImg}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>

      {/* Right: gradient + text (main content) */}
      <div className="relative flex-1 flex flex-col justify-center py-3 sm:py-4 md:py-5 px-4 sm:px-6 bg-gradient-to-r from-rose-700 via-red-700 to-pink-700 dark:from-rose-800 dark:via-red-800 dark:to-pink-800">
        {/* Subtle floating hearts (decorative) */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
          <span className="absolute top-[10%] right-[15%] text-xl sm:text-2xl opacity-30 animate-pulse" style={{ animationDuration: "2.5s" }}>❤️</span>
          <span className="absolute top-[25%] right-[8%] text-lg sm:text-xl opacity-25 animate-pulse" style={{ animationDuration: "3s" }}>💕</span>
          <span className="absolute bottom-[20%] right-[12%] text-lg opacity-20 animate-pulse" style={{ animationDuration: "2.8s" }}>💗</span>
          <span className="absolute bottom-[10%] right-[20%] text-xl opacity-30 animate-pulse" style={{ animationDuration: "2.2s" }}>❤️</span>
        </div>

        <div className="relative text-center sm:text-left text-white w-full max-w-xl">
          <p className="text-rose-100 dark:text-rose-200 text-[10px] sm:text-xs uppercase tracking-widest font-semibold mb-0.5">
            February 14
          </p>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold mb-1 drop-shadow-sm">
            Happy Valentine&apos;s Day
          </h1>
          <p className="text-xs sm:text-sm text-white/95 dark:text-rose-50 mb-1 leading-snug">
            With love from everyone at <span className="font-semibold">BuySell Club</span>. We wish you and yours a day full of joy and connection.
          </p>
          <p className="text-xs text-white/90 dark:text-rose-100 mb-2">
            Thank you for being part of our journey. 💝
          </p>
          <Link
            to="/Community"
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white text-rose-600 dark:bg-white/95 dark:text-rose-700 font-semibold text-xs shadow-lg hover:bg-rose-50 dark:hover:bg-white transition-colors"
          >
            Join Community
          </Link>
        </div>
      </div>
    </section>
  );
};

export default ValentineWish;
