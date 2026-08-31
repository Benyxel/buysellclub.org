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

const linkClass =
  "text-slate-400 hover:text-white transition-colors text-sm leading-relaxed block";

const headingClass =
  "text-white font-semibold text-sm tracking-wide mb-4 text-left";

const Footer = () => {
  return (
    <footer className="bg-slate-900 text-slate-300 mt-auto border-t border-slate-800">
      <div className="container mx-auto px-4 py-10 md:py-12">
        {/* Logo + tagline + social — centered on mobile (Odoo-style), left on large screens */}
        <div className="text-center lg:text-left mb-10 lg:mb-12 pb-10 border-b border-slate-700/80">
          <Link to="/" className="inline-block">
            <img
              src={buysellogo}
              alt="BuySellClub Logo"
              className="h-12 md:h-14 object-contain mx-auto lg:mx-0"
            />
          </Link>
          <p className="text-slate-400 text-sm mt-4 max-w-md mx-auto lg:mx-0">
            Your one-stop destination for quality products and exceptional
            service. We bring the best products to your doorstep.
          </p>
          <div className="flex justify-center lg:justify-start gap-4 mt-5">
            <a
              href="#"
              className="text-slate-500 hover:text-white transition-colors"
              aria-label="Facebook"
            >
              <FaFacebook className="w-5 h-5" />
            </a>
            <a
              href="#"
              className="text-slate-500 hover:text-white transition-colors"
              aria-label="Twitter"
            >
              <FaTwitter className="w-5 h-5" />
            </a>
            <a
              href="#"
              className="text-slate-500 hover:text-white transition-colors"
              aria-label="Instagram"
            >
              <FaInstagram className="w-5 h-5" />
            </a>
            <a
              href="#"
              className="text-slate-500 hover:text-white transition-colors"
              aria-label="LinkedIn"
            >
              <FaLinkedin className="w-5 h-5" />
            </a>
          </div>
        </div>

        {/* Mobile: 2-column grid (Odoo-style). Desktop: 4 columns */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10 lg:gap-8 text-left">
          <div>
            <h3 className={headingClass}>Quick links</h3>
            <ul className="space-y-2.5">
              <li>
                <Link to="/Shop" className={linkClass}>
                  Shop
                </Link>
              </li>
              <li>
                <Link to="/Signup" className={linkClass}>
                  Sign up
                </Link>
              </li>
              <li>
                <Link to="/Services" className={linkClass}>
                  Services
                </Link>
              </li>
              <li>
                <Link to="/About" className={linkClass}>
                  About us
                </Link>
              </li>
              <li>
                <Link to="/Contact" className={linkClass}>
                  Contact
                </Link>
              </li>
              <li>
                <Link to="/Policies" className={linkClass}>
                  Policies &amp; compliance
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className={headingClass}>Shipping &amp; tracking</h3>
            <ul className="space-y-2.5">
              <li>
                <Link to="/tracking" className={linkClass}>
                  Tracking
                </Link>
              </li>
              <li>
                <Link to="/QuickTracking" className={linkClass}>
                  Goods Received
                </Link>
              </li>
              <li>
                <Link to="/Delivery" className={linkClass}>
                  Delivery
                </Link>
              </li>
              <li>
                <Link to="/OurRates" className={linkClass}>
                  Our rates
                </Link>
              </li>
              <li>
                <Link to="/get-app" className={linkClass}>
                  Get the app
                </Link>
              </li>
              <li>
                <Link to="/Training" className={linkClass}>
                  Training
                </Link>
              </li>
              <li>
                <Link to="/Gallery" className={linkClass}>
                  Gallery
                </Link>
              </li>
              <li>
                <Link to="/Community" className={linkClass}>
                  Community
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className={headingClass}>Your account</h3>
            <ul className="space-y-2.5">
              <li>
                <Link to="/Orders" className={linkClass}>
                  Track order
                </Link>
              </li>
              <li>
                <Link to="/Cart" className={linkClass}>
                  Shopping cart
                </Link>
              </li>
              <li>
                <Link to="/Favorites" className={linkClass}>
                  Favorites
                </Link>
              </li>
              <li>
                <Link to="/Checkout" className={linkClass}>
                  Checkout
                </Link>
              </li>
            </ul>
          </div>

          <div className="col-span-2 lg:col-span-1 min-w-0">
            <h3 className={headingClass}>Contact us</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-slate-400 text-sm">
                <FaPhone className="w-4 h-4 mt-0.5 text-slate-500 shrink-0" />
                <span className="flex flex-wrap gap-x-1 gap-y-1">
                  <a
                    href="tel:+233535377248"
                    className="hover:text-white transition-colors"
                  >
                    +233 53 537 7248
                  </a>
                  <span className="text-slate-600">/</span>
                  <a
                    href="tel:+233540266839"
                    className="hover:text-white transition-colors"
                  >
                    +233 54 026 6839
                  </a>
                </span>
              </li>
              <li className="flex items-start gap-2 text-slate-400 text-sm">
                <FaEnvelope className="w-4 h-4 mt-0.5 text-slate-500 shrink-0" />
                <a
                  href="mailto:support@buysellclub.org"
                  className="hover:text-white transition-colors break-all"
                >
                  support@buysellclub.org
                </a>
              </li>
              <li className="flex items-start gap-2 text-slate-400 text-sm">
                <FaMapMarkerAlt className="w-4 h-4 mt-0.5 text-slate-500 shrink-0" />
                <span>
                  FOFOOFO GROUP, Israel Palm-plaza, Okropom Street
                  (Pazzy&apos;s Villa), Accra
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-700/80 mt-10 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-slate-500">
            <p>
              © {new Date().getFullYear()} Buysellclub. All rights reserved.
            </p>
            <div className="flex flex-wrap justify-center gap-4 md:gap-6">
              <Link
                to="/Policies#compliance"
                className="hover:text-white transition-colors"
              >
                Privacy &amp; data policy
              </Link>
              <Link
                to="/Policies#operations"
                className="hover:text-white transition-colors"
              >
                Service terms
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
