import React from 'react'
import { FaBox, FaClock, FaArrowLeft } from 'react-icons/fa'
import { Link } from 'react-router-dom'

const Wholesale = () => {
  return (
    <div>
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 md:p-12 text-center">
            <div className="mb-6 flex justify-center">
              <div className="bg-primary/10 rounded-full p-6">
                <FaBox className="text-6xl text-primary" />
              </div>
            </div>
            <div className="mb-4 flex items-center justify-center gap-2 text-primary">
              <FaClock className="text-xl" />
              <span className="text-lg font-semibold uppercase tracking-wide">Coming Soon</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Wholesale Products
            </h1>
            <p className="text-gray-600 dark:text-gray-300 text-lg mb-8 leading-relaxed">
              We're working hard to bring you access to high-quality products at wholesale prices. 
              This feature will allow you to browse and purchase bulk products directly from China.
            </p>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 mb-8">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">What to expect:</p>
              <ul className="text-left space-y-2 text-gray-700 dark:text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">✓</span>
                  <span>Bulk discounts on quality products</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">✓</span>
                  <span>Direct access to verified suppliers</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">✓</span>
                  <span>Regular stock updates and new arrivals</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">✓</span>
                  <span>Business support and dedicated account management</span>
                </li>
              </ul>
            </div>
            <Link
              to="/"
              className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors font-semibold"
            >
              <FaArrowLeft />
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Wholesale
