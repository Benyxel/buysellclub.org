import React from "react";
import {
  FaTruck,
  FaShoppingCart,
  FaMapMarkerAlt,
  FaBox,
  FaUsers,
  FaGlobe,
  FaShieldAlt,
  FaHeadset,
} from "react-icons/fa";
import { Link } from "react-router-dom";

const About = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-4">
          About Fofoofo
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
          Your trusted partner in international shipping and e-commerce. We
          connect Ghana to the world, making global shopping accessible and
          reliable.
        </p>
      </div>

      {/* Mission Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 mb-12">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4">
            Our Mission
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            At Fofoofo, we're dedicated to revolutionizing the way Ghanaians
            access global products. Our mission is to provide seamless
            international shipping solutions, making it easier for our customers
            to shop from anywhere in the world.
          </p>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
        {/* Buy4Me Service */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
              <FaShoppingCart className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
              Buy4Me Service
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Shop from any international store with our Buy4Me service. We handle
            the entire process from purchase to delivery, ensuring a smooth
            shopping experience.
          </p>
        </div>

        {/* Shipping Marks */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
              <FaMapMarkerAlt className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
              Shipping Marks
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Get your unique shipping address for international purchases. Our
            shipping marks system ensures your packages are correctly routed and
            delivered.
          </p>
        </div>

        {/* Order Tracking */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-full">
              <FaTruck className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
              Real-time Tracking
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Track your shipments in real-time with our advanced tracking system.
            Stay updated on your package's journey from origin to delivery.
          </p>
        </div>

        {/* Global Reach */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-full">
              <FaGlobe className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
              Global Reach
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Access products from around the world. Our extensive network ensures
            reliable shipping from major international markets to Ghana.
          </p>
        </div>

        {/* Secure Shipping */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-red-100 dark:bg-red-900 rounded-full">
              <FaShieldAlt className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
              Secure Shipping
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Your packages are handled with care and security. We ensure safe
            delivery with proper packaging and handling throughout the shipping
            process.
          </p>
        </div>

        {/* Customer Support */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-900 rounded-full">
              <FaHeadset className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
              Customer Support
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Our dedicated support team is here to help. Get assistance with
            shipping, tracking, and any other queries you may have.
          </p>
        </div>
      </div>

      {/* Call to Action */}
      <div className="text-center mb-16">
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4">
          Ready to Get Started?
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Join thousands of satisfied customers who trust Fofoofo for their
          international shipping needs.
        </p>
        <div className="flex justify-center gap-4">
          <Link
            to="/Fofoofo-address"
            className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Get Your Shipping Address
          </Link>
          <Link
            to="/Buy4Me"
            className="px-6 py-3 bg-white dark:bg-gray-700 text-primary border border-primary rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            Start Shopping
          </Link>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="text-center">
          <div className="text-4xl font-bold text-primary mb-2">10K+</div>
          <div className="text-gray-600 dark:text-gray-400">
            Happy Customers
          </div>
        </div>
        <div className="text-center">
          <div className="text-4xl font-bold text-primary mb-2">50+</div>
          <div className="text-gray-600 dark:text-gray-400">
            Countries Served
          </div>
        </div>
        <div className="text-center">
          <div className="text-4xl font-bold text-primary mb-2">99%</div>
          <div className="text-gray-600 dark:text-gray-400">
            Delivery Success Rate
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
