import React, { useState, useEffect } from "react";
import { FaMapMarkerAlt, FaCalculator } from "react-icons/fa";
import { Link } from "react-router-dom";
import CBMCalculator from "./CBMCalculator";
import API from "../api";

const ACCENT_CLASSES = [
  "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
  "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400",
  "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
  "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400",
];

const ShippingDashboard = () => {
  const [warehouseAddresses, setWarehouseAddresses] = useState([]);

  useEffect(() => {
    const fetchWarehouses = async () => {
      try {
        const res = await API.get("/buysellapi/warehouse-addresses/");
        setWarehouseAddresses(Array.isArray(res.data) ? res.data : []);
      } catch (_) {
        setWarehouseAddresses([]);
      }
    };
    fetchWarehouses();
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header: Address Generators */}
        <div className="mb-8 border-b-2 border-gray-200 dark:border-gray-700 pb-8">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">
            Shipping Addresses
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Choose a warehouse region to generate your unique shipping address.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* China Address Generator (fixed – own logic/table) */}
            <Link
              to="/Fofoofo-address-generator"
              className="group flex flex-col p-6 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:border-primary dark:hover:border-primary transition-all duration-300"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                  <FaMapMarkerAlt className="w-5 h-5" />
                </div>
                <span className="font-semibold text-gray-800 dark:text-white">
                  China
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 flex-grow">
                FIMPORT China warehouse. Generate your address for shipments from China.
              </p>
              <span className="text-sm text-primary font-medium group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                Open China generator →
              </span>
            </Link>

            {/* Admin-configured warehouse addresses (USA, Dubai, etc.) */}
            {warehouseAddresses.map((wa, idx) => (
              <Link
                key={wa.id}
                to={`/address-generator/${encodeURIComponent(wa.code)}`}
                className="group flex flex-col p-6 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:border-primary dark:hover:border-primary transition-all duration-300"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-2 rounded-lg ${ACCENT_CLASSES[idx % ACCENT_CLASSES.length]}`}>
                    <FaMapMarkerAlt className="w-5 h-5" />
                  </div>
                  <span className="font-semibold text-gray-800 dark:text-white">
                    {wa.display_name}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 flex-grow">
                  {wa.display_name} warehouse. Generate your address for shipments to this region.
                </p>
                <span className="text-sm text-primary font-medium group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                  Open {wa.display_name} generator →
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* CBM Calculator */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg shadow-md p-6">
          <div className="flex items-center gap-4 mb-8">
            <FaCalculator className="text-2xl sm:text-3xl text-primary" />
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white">
                CBM Calculator
              </h2>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                Calculate shipping costs based on package dimensions
              </p>
            </div>
          </div>
          <CBMCalculator />
        </div>
      </div>
    </div>
  );
};

export default ShippingDashboard;
