import React from 'react';
import PaidCourseManagement from './PaidCourseManagement';
import YouTubeManagement from './YouTubeManagement';

const Dashboard = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-8">Admin Dashboard</h1>
      
      {/* Training Section */}
      <div className="space-y-12">
        {/* Paid Courses Section */}
        <section>
          <PaidCourseManagement />
        </section>

        {/* YouTube Videos Section */}
        <section className="mt-12">
          <YouTubeManagement />
        </section>
      </div>
    </div>
  );
};

export default Dashboard; 