import React from "react";
import { Link } from "react-router-dom";

const NotFound = () => {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <h1 className="text-6xl font-extrabold text-primary mb-4">404</h1>
      <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-2">Page not found</h2>
      <p className="text-gray-600 dark:text-gray-400 max-w-md mb-6">
        The page you are looking for doesn't exist or has been moved.
      </p>
      <div className="flex gap-3">
        <Link
          to="/"
          className="px-5 py-2 rounded-lg bg-primary text-white hover:bg-primary/90"
        >
          Go Home
        </Link>
        <Link
          to="/Shop"
          className="px-5 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-white"
        >
          Visit Shop
        </Link>
      </div>
    </div>
  );
};

export default NotFound;


