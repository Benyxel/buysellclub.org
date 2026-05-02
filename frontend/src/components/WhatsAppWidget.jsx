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
      className={`fixed bottom-5 right-4 z-[1090] flex h-12 items-center gap-2 rounded-full bg-green-500 px-5 text-sm font-semibold text-white shadow-xl transition-all hover:scale-105 hover:bg-green-600 md:bottom-6 md:right-6 ${className}`}
      aria-label={label}
    >
      <FaWhatsapp className="shrink-0 text-white" />
      <span className="hidden sm:inline">{label}</span>
    </a>
  );
};

export default WhatsAppWidget;

