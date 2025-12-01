import React, { useState } from "react";
import {
  FaPhone,
  FaEnvelope,
  FaMapMarkerAlt,
  FaClock,
  FaWhatsapp,
  FaFacebook,
  FaTwitter,
  FaInstagram,
  FaLinkedin,
} from "react-icons/fa";
import { toast } from "react-toastify";
import API from "../api";

const Contact = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await API.post("/buysellapi/contact/", formData);
      
      if (response.data.success) {
        toast.success(response.data.message || "Message sent successfully! We'll get back to you soon.", {
          toastId: "contact-success"
        });
        // Reset form
        setFormData({
          name: "",
          email: "",
          subject: "",
          message: "",
        });
      }
    } catch (error) {
      console.error("Contact form error:", error);
      
      // Check if it's a 500 error but message might have been sent
      if (error.response?.status === 500) {
        // Check if we got a response with success message (sometimes errors occur after email is sent)
        if (error.response?.data?.success) {
          toast.success(error.response.data.message || "Message sent successfully! We'll get back to you soon.", {
            toastId: "contact-success-partial"
          });
          // Reset form
          setFormData({
            name: "",
            email: "",
            subject: "",
            message: "",
          });
        } else {
          // Real error - show error message
          const errorMessage = error.response?.data?.error || 
                               error.response?.data?.message || 
                               error.message || 
                               "Failed to send message. Please try again later or contact us directly.";
          toast.error(errorMessage, {
            toastId: "contact-error"
          });
        }
      } else {
        // Other errors (400, 401, etc.)
        const errorMessage = error.response?.data?.error || 
                             error.response?.data?.message || 
                             error.message || 
                             "Failed to send message. Please try again later.";
        toast.error(errorMessage, {
          toastId: "contact-error"
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-4">
          Contact Us
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
          Have questions? We're here to help. Get in touch with us through any
          of our contact channels.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Contact Information */}
        <div className="space-y-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-6">
              Get in Touch
            </h2>

            {/* Contact Details */}
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-full">
                  <FaPhone className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-800 dark:text-white">
                    Phone
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    +233 540266839 / +233 535377248
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-full">
                  <FaEnvelope className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-800 dark:text-white">
                    Email
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    support@fofoofogroup.com
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-full">
                  <FaMapMarkerAlt className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-800 dark:text-white">
                    Address
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                  Israel Yellow, Okropom street(Pazzy's Villa),
                    <br />
                    Accra, Ghana
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-full">
                  <FaClock className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-800 dark:text-white">
                    Business Hours
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Monday - Friday: 9:00 AM - 6:00 PM
                    <br />
                    Saturday: Closed
                    <br />
                    Sunday: Closed
                  </p>
                </div>
              </div>
            </div>

            {/* Social Media Links */}
            <div className="mt-8">
              <h3 className="font-medium text-gray-800 dark:text-white mb-4">
                Follow Us
              </h3>
              <div className="flex gap-4">
                <a
                  href="#"
                  className="text-gray-400 hover:text-primary transition-colors"
                >
                  <FaFacebook className="w-6 h-6" />
                </a>
                <a
                  href="#"
                  className="text-gray-400 hover:text-primary transition-colors"
                >
                  <FaTwitter className="w-6 h-6" />
                </a>
                <a
                  href="#"
                  className="text-gray-400 hover:text-primary transition-colors"
                >
                  <FaInstagram className="w-6 h-6" />
                </a>
                <a
                  href="#"
                  className="text-gray-400 hover:text-primary transition-colors"
                >
                  <FaLinkedin className="w-6 h-6" />
                </a>
              </div>
            </div>

            {/* WhatsApp Button */}
            <a
              href="https://wa.me/233540266839"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 flex items-center gap-2 bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition-colors"
            >
              <FaWhatsapp className="w-5 h-5" />
              Chat with us on WhatsApp
            </a>
          </div>
        </div>

        {/* Contact Form */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-6">
            Send us a Message
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Your Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
                required
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
                required
              />
            </div>

            <div>
              <label
                htmlFor="subject"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Subject
              </label>
              <input
                type="text"
                id="subject"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
                required
              />
            </div>

            <div>
              <label
                htmlFor="message"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Message
              </label>
              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                rows="4"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
                required
              ></textarea>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors ${
                loading ? "opacity-70 cursor-not-allowed" : ""
              }`}
            >
              {loading ? "Sending..." : "Send Message"}
            </button>
          </form>
        </div>
      </div>

      {/* Map Section */}
      <div className="mt-16">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-6">
            Find Us
          </h2>
           <div className="relative">
             <div className="aspect-w-16 aspect-h-9 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden relative min-h-[450px]">
               <iframe
                 src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3970.0!2d-0.2653476!3d5.6357079!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xfdf98d766f86a03%3A0x16cd336d229eabb1!2sPazzys%20villa!5e0!3m2!1sen!2sgh!4v1700000000000!5m2!1sen!2sgh"
                 width="100%"
                 height="450"
                 style={{ border: 0 }}
                 allowFullScreen=""
                 loading="lazy"
                 referrerPolicy="no-referrer-when-downgrade"
                 className="rounded-lg w-full h-full absolute inset-0"
                 title="BuySellClub Location - Pazzys Villa"
               ></iframe>
             </div>
            {/* Fallback if map is blocked */}
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                <strong>Note:</strong> If the map above is not visible, it may be blocked by your browser's privacy settings or ad blocker.
              </p>
              <div className="flex flex-wrap gap-4 mt-3">
                <a
                  href="https://www.google.com/maps/search/?api=1&query=Israel+Yellow,+Okropom+street,+Pazzy's+Villa,+Accra,+Ghana"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm"
                >
                  <FaMapMarkerAlt className="w-4 h-4" />
                  Open in Google Maps
                </a>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent("Israel Yellow, Okropom street, Pazzy's Villa, Accra, Ghana")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm"
                >
                  <FaMapMarkerAlt className="w-4 h-4" />
                  Get Directions
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
