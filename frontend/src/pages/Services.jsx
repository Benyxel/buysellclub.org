import React from "react";
import {
  FaTruck,
  FaShoppingCart,
  FaMoneyBillWave,
  FaBox,
  FaShippingFast,
  FaHandshake,
  FaGlobe,
  FaHeadset,
  FaUsers,
  FaGraduationCap,
} from "react-icons/fa";
import { Link } from "react-router-dom";
import heroS1 from "../assets/HeroS1.png";
import heroS2 from "../assets/heros2.png";
import rmbImage from "../assets/rmbi.png";
import storeImage from "../assets/store.png";
import suppliersImage from "../assets/spr1.jpg";
import trainingImage from "../assets/Tr1.jpg";

const Services = () => {
  const services = [
    {
      id: 1,
      title: "International Shipping",
      subtitle: "Logistic Services",
      description:
        "Reliable shipping services from China to Ghana. We handle the entire shipping process, ensuring your goods arrive safely and on time.",
      icon: <FaTruck className="w-8 h-8" />,
      image: heroS1,
      link: "/Shipping",
      features: [
        "Door-to-door delivery",
        "Real-time tracking",
        "Customs clearance assistance",
        "Secure packaging",
      ],
    },
    {
      id: 2,
      title: "Buy4Me Service",
      subtitle: "Personal Shopping Assistant",
      description:
        "Let us shop for you from China. We'll handle the entire process from product selection to delivery to your doorstep.",
      icon: <FaShoppingCart className="w-8 h-8" />,
      image: heroS2,
      link: "/Buy4me",
      features: [
        "Product sourcing",
        "Price negotiation",
        "Quality verification",
        "Secure payment handling",
      ],
    },
    {
      id: 3,
      title: "RMB Trading",
      subtitle: "Currency Exchange",
      description:
        "Easy and secure RMB trading services. We make international payments simple and reliable.",
      icon: <FaMoneyBillWave className="w-8 h-8" />,
      image: rmbImage,
      link: "/AlipayPayment",
      features: [
        "Competitive exchange rates",
        "Secure transactions",
        "Quick processing",
        "24/7 support",
      ],
    },
    {
      id: 4,
      title: "Wholesale Products",
      subtitle: "Bulk Purchasing",
      description:
        "Access high-quality products at wholesale prices. Perfect for businesses and resellers.",
      icon: <FaBox className="w-8 h-8" />,
      image: storeImage,
      link: "/Wholesale",
      features: [
        "Bulk discounts",
        "Quality assurance",
        "Regular stock updates",
        "Business support",
      ],
    },
    {
      id: 5,
      title: "Supplier Network",
      subtitle: "Verified Suppliers",
      description:
        "Connect with our network of verified suppliers in China. Access quality products directly from manufacturers.",
      icon: <FaUsers className="w-8 h-8" />,
      image: suppliersImage,
      link: "/Suppliers",
      features: [
        "Verified manufacturers",
        "Direct factory access",
        "Quality control",
        "Competitive pricing",
      ],
    },
    {
      id: 6,
      title: "Training Programs",
      subtitle: "Business Education",
      description:
        "Comprehensive training programs to help you succeed in international trade and e-commerce.",
      icon: <FaGraduationCap className="w-8 h-8" />,
      image: trainingImage,
      link: "/Training",
      features: [
        "E-commerce basics",
        "International trade",
        "Business management",
        "Digital marketing",
      ],
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-4">
          Our Services
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
          Comprehensive solutions for your international shipping and trading
          needs. We connect Ghana to the world.
        </p>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
        {services.map((service) => (
          <div
            key={service.id}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
          >
            <div className="relative h-48">
              <img
                src={service.image}
                alt={service.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <div className="p-4 bg-white/90 dark:bg-gray-800/90 rounded-full">
                  {service.icon}
                </div>
              </div>
            </div>
            <div className="p-6">
              <span className="text-sm text-primary font-medium">
                {service.subtitle}
              </span>
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mt-2 mb-4">
                {service.title}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {service.description}
              </p>
              <div className="space-y-2 mb-6">
                {service.features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                    <span className="text-gray-600 dark:text-gray-400">
                      {feature}
                    </span>
                  </div>
                ))}
              </div>
              <Link
                to={service.link}
                className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors"
              >
                Learn More
                <FaShippingFast className="w-5 h-5" />
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Why Choose Us Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 mb-16">
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-8 text-center">
          Why Choose Fofoofo?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="p-4 bg-primary/10 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <FaGlobe className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-2">
              Global Network
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Extensive network of partners and suppliers worldwide
            </p>
          </div>
          <div className="text-center">
            <div className="p-4 bg-primary/10 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <FaHandshake className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-2">
              Trusted Partner
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Reliable and transparent service with proven track record
            </p>
          </div>
          <div className="text-center">
            <div className="p-4 bg-primary/10 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <FaHeadset className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-2">
              Dedicated Support
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              24/7 customer support for all your needs
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4">
          Ready to Get Started?
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Contact us today to learn more about our services
        </p>
        <Link
          to="/Contact"
          className="inline-flex items-center gap-2 bg-primary text-white px-8 py-4 rounded-lg hover:bg-primary/90 transition-colors"
        >
          Contact Us
          <FaHeadset className="w-5 h-5" />
        </Link>
      </div>
    </div>
  );
};

export default Services;
