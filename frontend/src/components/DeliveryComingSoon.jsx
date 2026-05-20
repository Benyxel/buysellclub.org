import React from "react";
import { FaMotorcycle, FaClock, FaArrowLeft } from "react-icons/fa";
import { Link } from "react-router-dom";

/**
 * Shared "delivery not available yet" UI (matches Quicklinks like Wholesale / Suppliers).
 */
export function DeliveryComingSoonContent({ compact = false }) {
  const iconWrap = compact ? "p-4" : "p-6";
  const iconSize = compact ? "text-4xl" : "text-6xl";

  return (
    <>
      <div className={`mb-6 flex justify-center ${compact ? "mb-4" : ""}`}>
        <div className={`rounded-full bg-primary/10 ${iconWrap}`}>
          <FaMotorcycle className={`${iconSize} text-primary`} />
        </div>
      </div>
      <div className="mb-4 flex items-center justify-center gap-2 text-primary">
        <FaClock className="text-xl" />
        <span className="text-lg font-semibold uppercase tracking-wide">
          Coming Soon
        </span>
      </div>
      <h1
        className={`font-bold text-gray-900 dark:text-white ${
          compact ? "mb-3 text-2xl" : "mb-4 text-3xl md:text-4xl"
        }`}
      >
        Rider delivery
      </h1>
      <p
        className={`mx-auto text-gray-600 dark:text-gray-300 leading-relaxed ${
          compact ? "mb-4 max-w-md text-sm" : "mb-8 max-w-xl text-lg"
        }`}
      >
        This feature is not available right now. We are working on bringing
        local rider delivery to the app — check back soon.
      </p>
    </>
  );
}

export default function DeliveryComingSoon() {
  return (
    <div className="min-h-[60vh] bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-2xl bg-white p-8 text-center shadow-xl dark:bg-gray-800 md:p-12">
            <DeliveryComingSoonContent />
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-semibold text-white transition-colors hover:bg-primary/90"
            >
              <FaArrowLeft />
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
