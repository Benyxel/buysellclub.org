import React from "react";
import { FaWhatsapp } from "react-icons/fa";

const WhatsAppWidget = ({
  phone,
  label = "Chat with us on WhatsApp",
  className = "",
}) => {
  if (!phone) return null;

  const cleanPhone = phone.replace(/[^\d]/g, "");
  const href = `https://wa.me/${cleanPhone}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`fixed bottom-4 right-4 md:bottom-6 md:right-6 z-[1090] flex items-center gap-2 rounded-full bg-green-500 hover:bg-green-600 px-4 py-2.5 md:px-5 md:py-3 text-sm font-semibold text-white shadow-xl transition-all hover:scale-105 ${className}`}
      aria-label={label}
    >
      <FaWhatsapp className="text-base md:text-lg" />
      <span className="hidden sm:inline">{label}</span>
    </a>
  );
};

export default WhatsAppWidget;

