import React from "react";
import { FaTools, FaClock, FaEnvelope } from "react-icons/fa";

const MaintenancePage = ({ title, message, estimatedTime }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center">
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8 md:p-12">
          {/* Icon */}
          <div className="mb-6 flex justify-center">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg animate-pulse">
              <FaTools className="text-4xl text-white" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-white mb-4">
            {title || "We'll be back soon!"}
          </h1>

          {/* Message */}
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
            {message ||
              "We're currently performing some maintenance. We'll be back shortly. Thank you for your patience!"}
          </p>

          {/* Estimated Time */}
          {estimatedTime && (
            <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400 mb-6">
              <FaClock className="text-lg" />
              <span className="font-semibold">Estimated time: {estimatedTime}</span>
            </div>
          )}

          {/* Decorative Elements */}
          <div className="flex justify-center gap-2 mt-8">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
            <div className="w-3 h-3 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
            <div className="w-3 h-3 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
          </div>

          {/* Contact Info */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Need immediate assistance?
            </p>
            <div className="flex items-center justify-center gap-2 mt-2 text-primary hover:text-primary-focus">
              <FaEnvelope className="text-sm" />
              <a href="mailto:support@example.com" className="text-sm font-medium">
                Support@buysellclub.org
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MaintenancePage;

