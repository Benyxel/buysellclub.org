import React from "react";
import { FaWhatsapp, FaRegCommentDots } from "react-icons/fa";
import LiveChatWidget from "./LiveChatWidget";

const SupportWidget = ({
  whatsappPhone,
  whatsappLabel = "WhatsApp",
  chatLabel = "Chat with us",
}) => {
  const handleWhatsAppClick = () => {
    if (!whatsappPhone) return;
    const cleanPhone = whatsappPhone.replace(/[^\d]/g, "");
    const href = `https://wa.me/${cleanPhone}`;
    window.open(href, "_blank", "noopener,noreferrer");
  };

  const handleChatClick = () => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new Event("toggleLiveChatWidget"));
  };

  return (
    <>
      <LiveChatWidget hideLauncher />
      <div className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-[1100] rounded-full shadow-xl overflow-hidden flex">
        <button
          type="button"
          onClick={handleWhatsAppClick}
          className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2.5 text-sm font-semibold transition-colors"
        >
          <FaWhatsapp className="text-base" />
          <span className="hidden sm:inline">{whatsappLabel}</span>
        </button>
        <button
          type="button"
          onClick={handleChatClick}
          className="flex items-center gap-2 bg-pink-500 hover:bg-pink-600 text-white px-4 py-2.5 text-sm font-semibold transition-colors"
        >
          <FaRegCommentDots className="text-base" />
          <span className="hidden sm:inline">{chatLabel}</span>
        </button>
      </div>
    </>
  );
};

export default SupportWidget;

