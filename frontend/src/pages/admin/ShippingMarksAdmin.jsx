import React from 'react';
import ShippingMarksDisplay from '../../components/ShippingMarksDisplay';

const ShippingMarksAdmin = () => {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="py-6">
        <header className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Shipping Marks Viewer
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            View all shipping marks created through the Address Management tab
          </p>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <ShippingMarksDisplay />
        </main>
      </div>
    </div>
  );
};

export default ShippingMarksAdmin;