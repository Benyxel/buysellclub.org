import React from "react";
import { Link } from "react-router-dom";
import { FaHandshake, FaGlobe, FaCheckCircle, FaArrowRight } from "react-icons/fa";
import supplierImage from "../assets/ch.jpg";

const SupplierBanner = () => {
  return (
    <section className="relative bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 dark:from-black dark:via-gray-900 dark:to-black py-16 md:py-20 overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}></div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Left Side - Content */}
          <div className="text-white space-y-6">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
              <FaHandshake className="text-green-500" />
              <span className="text-sm font-medium">Connect with China</span>
            </div>
            
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight">
              Direct Access to{" "}
              <span className="text-green-500">Verified Suppliers</span> in China
            </h2>
            
            <p className="text-lg md:text-xl text-gray-300 dark:text-gray-400 leading-relaxed">
              Build strong partnerships with trusted Chinese manufacturers and suppliers. 
              We connect you directly to quality suppliers, ensuring competitive prices 
              and reliable sourcing for your business needs.
            </p>

            {/* Features */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              <div className="flex items-start gap-3">
                <FaCheckCircle className="text-green-500 text-xl mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-white mb-1">Verified Suppliers</h4>
                  <p className="text-sm text-gray-300 dark:text-gray-400">
                    All suppliers are verified and quality-checked
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <FaCheckCircle className="text-green-500 text-xl mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-white mb-1">Direct Communication</h4>
                  <p className="text-sm text-gray-300 dark:text-gray-400">
                    Connect directly with manufacturers
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <FaCheckCircle className="text-green-500 text-xl mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-white mb-1">Competitive Pricing</h4>
                  <p className="text-sm text-gray-300 dark:text-gray-400">
                    Best prices from factory-direct sources
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <FaCheckCircle className="text-green-500 text-xl mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-white mb-1">Quality Assurance</h4>
                  <p className="text-sm text-gray-300 dark:text-gray-400">
                    Quality control and inspection services
                  </p>
                </div>
              </div>
            </div>

            {/* CTA Button */}
            <div className="pt-4">
              <Link
                to="/Suppliers"
                className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold px-8 py-4 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                Explore Supplier Network
                <FaArrowRight />
              </Link>
            </div>
          </div>

          {/* Right Side - Image */}
          <div className="relative">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl transform hover:scale-105 transition-transform duration-300">
              {/* Image container */}
              <div className="aspect-[4/3] relative">
                <img 
                  src={supplierImage} 
                  alt="Connecting with Chinese suppliers - Professional team in front of modern building" 
                  className="w-full h-full object-cover"
                />
                
                {/* Decorative overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900/50 to-transparent pointer-events-none"></div>
              </div>
            </div>
            
            {/* Decorative elements */}
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-green-500/20 rounded-full blur-2xl"></div>
            <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-gray-600/20 rounded-full blur-3xl"></div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SupplierBanner;

