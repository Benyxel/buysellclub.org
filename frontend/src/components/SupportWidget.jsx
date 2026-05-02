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
      <div className="fixed bottom-5 right-4 z-[1100] flex overflow-hidden rounded-full shadow-xl md:bottom-6 md:right-6">
        <button
          type="button"
          onClick={handleWhatsAppClick}
          className="flex h-12 items-center gap-2 bg-green-500 px-5 text-sm font-semibold text-white transition-colors hover:bg-green-600"
        >
          <FaWhatsapp className="shrink-0 text-white" />
          <span className="hidden sm:inline">{whatsappLabel}</span>
        </button>
        <button
          type="button"
          onClick={handleChatClick}
          className="flex h-12 items-center gap-2 bg-pink-500 px-5 text-sm font-semibold text-white transition-colors hover:bg-pink-600"
        >
          <FaRegCommentDots className="shrink-0 text-white" />
          <span className="hidden sm:inline">{chatLabel}</span>
        </button>
      </div>
    </>
  );
};

export default SupportWidget;

