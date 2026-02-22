import React from "react";
import { Link } from "react-router-dom";
import valImg from "../assets/val.png";

const Event = () => {
  return (
    <section
      className="relative overflow-hidden min-h-[140px] sm:min-h-[160px] md:min-h-[180px] flex flex-col sm:flex-row sm:items-stretch"
      aria-label="Community event - get supplier contacts"
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
        <div className="relative text-center sm:text-left text-white w-full max-w-xl">
          <p className="text-rose-100 dark:text-rose-200 text-[10px] sm:text-xs uppercase tracking-widest font-semibold mb-0.5">
            Community
          </p>
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-1 drop-shadow-sm">
            Get verified supplier contacts
          </h2>
          <p className="text-xs sm:text-sm text-white/95 dark:text-rose-50 mb-1 leading-snug">
            Join the <span className="font-semibold">BuySell Club</span> community to access verified supplier details and connect directly with trusted sources for your business.
          </p>
          <p className="text-xs text-white/90 dark:text-rose-100 mb-2">
            Approved members get access to supplier contact information.
          </p>
          <Link
            to="/Community"
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white text-rose-600 dark:bg-white/95 dark:text-rose-700 font-semibold text-xs shadow-lg hover:bg-rose-50 dark:hover:bg-white transition-colors"
          >
            Get supplier contacts
          </Link>
        </div>
      </div>
    </section>
  );
};

export default Event;
