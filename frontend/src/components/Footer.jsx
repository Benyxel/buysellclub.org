import React from "react";
import { Link } from "react-router-dom";
import {
  FaFacebook,
  FaTwitter,
  FaInstagram,
  FaLinkedin,
  FaPhone,
  FaEnvelope,
  FaMapMarkerAlt,
} from "react-icons/fa";
import buysellogo from "../assets/buysellogo.png";
import buysellogod from "../assets/buysellogod.png";

const Footer = () => {
  return (
    <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 mt-auto">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4 text-center md:text-left">
            <Link to="/" className="inline-block mx-auto md:mx-0">
              {/* Light mode logo */}
              <img
                src={buysellogod}
                alt="BuySellClub Logo"
                className="h-12 md:h-14 object-contain dark:hidden"
              />
              {/* Dark mode logo */}
              <img
                src={buysellogo}
                alt="BuySellClub Logo"
                className="h-12 md:h-14 object-contain hidden dark:block"
              />
            </Link>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Your one-stop destination for quality products and exceptional
              service. We bring the best products to your doorstep.
            </p>
            <div className="flex justify-center md:justify-start space-x-4">
              <a
                href="#"
                className="text-gray-400 hover:text-primary transition-colors"
              >
                <FaFacebook className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="text-gray-400 hover:text-primary transition-colors"
              >
                <FaTwitter className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="text-gray-400 hover:text-primary transition-colors"
              >
                <FaInstagram className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="text-gray-400 hover:text-primary transition-colors"
              >
                <FaLinkedin className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="text-center md:text-left">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
              Quick Links
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/Shop"
                  className="text-gray-600 dark:text-gray-400 hover:text-primary transition-colors"
                >
                  Shop
                </Link>
              </li>
              <li>
                <Link
                  to="/Signup"
                  className="text-gray-600 dark:text-gray-400 hover:text-primary transition-colors"
                >
                  Sign Up
                </Link>
              </li>
              <li>
                <Link
                  to="/Services"
                  className="text-gray-600 dark:text-gray-400 hover:text-primary transition-colors"
                >
                  Services
                </Link>
              </li>
              <li>
                <Link
                  to="/tracking"
                  className="text-gray-600 dark:text-gray-400 hover:text-primary transition-colors"
                >
                  Tracking
                </Link>
              </li>
              <li>
                <Link
                  to="/QuickTracking"
                  className="text-gray-600 dark:text-gray-400 hover:text-primary transition-colors"
                >
                  Quick Tracking
                </Link>
              </li>
              <li>
                <Link
                  to="/OurRates"
                  className="text-gray-600 dark:text-gray-400 hover:text-primary transition-colors"
                >
                  Our Rates
                </Link>
              </li>
              <li>
                <Link
                  to="/About"
                  className="text-gray-600 dark:text-gray-400 hover:text-primary transition-colors"
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  to="/Contact"
                  className="text-gray-600 dark:text-gray-400 hover:text-primary transition-colors"
                >
                  Contact
                </Link>
              </li>
              <li>
                <Link
                  to="/Policies"
                  className="text-gray-600 dark:text-gray-400 hover:text-primary transition-colors"
                >
                  Policies & Compliance
                </Link>
              </li>
              <li>
                <Link
                  to="/Donate"
                  className="text-gray-600 dark:text-gray-400 hover:text-primary transition-colors"
                >
                  Donate
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Service */}
          <div className="text-center md:text-left">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
              Customer Service
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/Orders"
                  className="text-gray-600 dark:text-gray-400 hover:text-primary transition-colors"
                >
                  Track Order
                </Link>
              </li>
              <li>
                <Link
                  to="/Cart"
                  className="text-gray-600 dark:text-gray-400 hover:text-primary transition-colors"
                >
                  Shopping Cart
                </Link>
              </li>
              <li>
                <Link
                  to="/Favorites"
                  className="text-gray-600 dark:text-gray-400 hover:text-primary transition-colors"
                >
                  Favorites
                </Link>
              </li>
              <li>
                <Link
                  to="/Checkout"
                  className="text-gray-600 dark:text-gray-400 hover:text-primary transition-colors"
                >
                  Checkout
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="text-center md:text-left">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
              Contact Us
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start justify-center md:justify-start gap-2 text-gray-600 dark:text-gray-400">
                <FaPhone className="w-5 h-5 mt-1 text-primary" />
                <a
                  href="tel:+233535377248"
                  className="hover:text-primary transition-colors"
                >
                  +233 53 537 7248
                </a>
                <span>/</span>
                <a
                  href="tel:+233540266839"
                  className="hover:text-primary transition-colors"
                >
                  +233 54 026 6839
                </a>
              </li>
              <li className="flex items-start justify-center md:justify-start gap-3 text-gray-600 dark:text-gray-400">
                <FaEnvelope className="w-5 h-5 mt-1 text-primary" />
                <a 
                  href="mailto:support@buysellclub.org" 
                  className="hover:text-primary transition-colors"
                >
                  support@buysellclub.org
                </a>
              </li>
              <li className="flex items-start justify-center md:justify-start gap-1 text-gray-600 dark:text-gray-400">
                <FaMapMarkerAlt className="w-5 h-5 mt-1 text-primary flex-shrink-0" />
                <span className="text-center md:text-left max-w-[220px] md:max-w-none">
                  FOFOOFO GROUP, Israel Palm-plaza, Okropom Street(Pazzy's
                  Villa), Accra{" "}
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-200 dark:border-gray-800 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              © {new Date().getFullYear()} Buysellclub. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm">
              <Link
                to="/Policies#compliance"
                className="text-gray-600 dark:text-gray-400 hover:text-primary transition-colors"
              >
                Privacy & Data Policy
              </Link>
              <Link
                to="/Policies#operations"
                className="text-gray-600 dark:text-gray-400 hover:text-primary transition-colors"
              >
                Service Terms
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

