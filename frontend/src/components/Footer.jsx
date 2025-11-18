import React from 'react';
import { Link } from 'react-router-dom';
import { FaFacebook, FaTwitter, FaInstagram, FaLinkedin, FaPhone, FaEnvelope, FaMapMarkerAlt } from 'react-icons/fa';

const Footer = () => {
  return (
    <footer className='bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 mt-auto'>
      <div className='container mx-auto px-4 py-12'>
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8'>
          {/* Company Info */}
          <div className='space-y-4'>
            <Link to="/" className='text-primary font-bold text-2xl tracking-wider uppercase hover:text-primary/90 transition-colors'>
              BuySellClub
            </Link>
            <p className='text-gray-600 dark:text-gray-400 text-sm'>
              Your one-stop destination for quality products and exceptional service. We bring the best products to your doorstep.
            </p>
            <div className='flex space-x-4'>
              <a href="#" className='text-gray-400 hover:text-primary transition-colors'>
                <FaFacebook className='w-5 h-5' />
              </a>
              <a href="#" className='text-gray-400 hover:text-primary transition-colors'>
                <FaTwitter className='w-5 h-5' />
              </a>
              <a href="#" className='text-gray-400 hover:text-primary transition-colors'>
                <FaInstagram className='w-5 h-5' />
              </a>
              <a href="#" className='text-gray-400 hover:text-primary transition-colors'>
                <FaLinkedin className='w-5 h-5' />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className='text-lg font-semibold text-gray-800 dark:text-white mb-4'>Quick Links</h3>
            <ul className='space-y-2'>
              <li>
                <Link to="/Shop" className='text-gray-600 dark:text-gray-400 hover:text-primary transition-colors'>
                  Shop
                </Link>
              </li>
              <li>
                <Link to="/Services" className='text-gray-600 dark:text-gray-400 hover:text-primary transition-colors'>
                  Services
                </Link>
              </li>
              <li>
                <Link to="/About" className='text-gray-600 dark:text-gray-400 hover:text-primary transition-colors'>
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/Contact" className='text-gray-600 dark:text-gray-400 hover:text-primary transition-colors'>
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h3 className='text-lg font-semibold text-gray-800 dark:text-white mb-4'>Customer Service</h3>
            <ul className='space-y-2'>
              <li>
                <Link to="/Orders" className='text-gray-600 dark:text-gray-400 hover:text-primary transition-colors'>
                  Track Order
                </Link>
              </li>
              <li>
                <Link to="/Cart" className='text-gray-600 dark:text-gray-400 hover:text-primary transition-colors'>
                  Shopping Cart
                </Link>
              </li>
              <li>
                <Link to="/Favorites" className='text-gray-600 dark:text-gray-400 hover:text-primary transition-colors'>
                  Favorites
                </Link>
              </li>
              <li>
                <Link to="/Checkout" className='text-gray-600 dark:text-gray-400 hover:text-primary transition-colors'>
                  Checkout
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className='text-lg font-semibold text-gray-800 dark:text-white mb-4'>Contact Us</h3>
            <ul className='space-y-3'>
              <li className='flex items-start gap-3 text-gray-600 dark:text-gray-400'>
                <FaPhone className='w-5 h-5 mt-1 text-primary' />
                <span>+233 53 537 7248/ +233 54 026 6839</span>
              </li>
              <li className='flex items-start gap-3 text-gray-600 dark:text-gray-400'>
                <FaEnvelope className='w-5 h-5 mt-1 text-primary' />
                <span>support@buysellclub.com</span>
              </li>
              <li className='flex items-start gap-3 text-gray-600 dark:text-gray-400'>
                <FaMapMarkerAlt className='w-5 h-5 mt-1 text-primary' />
                <span>FOFOOFO GROUP, Tabora Alhaji Station, Nii Okaiman West</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className='border-t border-gray-200 dark:border-gray-800 mt-12 pt-8'>
          <div className='flex flex-col md:flex-row justify-between items-center gap-4'>
            <p className='text-gray-600 dark:text-gray-400 text-sm'>
              © {new Date().getFullYear()} Buysellclub. All rights reserved.
            </p>
            <div className='flex gap-6 text-sm'>
              <Link to="/privacy" className='text-gray-600 dark:text-gray-400 hover:text-primary transition-colors'>
                Privacy Policy
              </Link>
              <Link to="/terms" className='text-gray-600 dark:text-gray-400 hover:text-primary transition-colors'>
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
