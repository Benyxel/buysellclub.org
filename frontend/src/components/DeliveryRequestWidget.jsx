import React, { useEffect, useRef, useState } from "react";
import { FaMotorcycle, FaTimes, FaGripVertical, FaLock } from "react-icons/fa";
import { DeliveryComingSoonContent } from "./DeliveryComingSoon";

const DeliveryRequestWidget = ({ launcherHidden = false } = {}) => {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const buttonRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem("deliveryRequestWidgetPosition");
    if (saved) {
      try {
        const pos = JSON.parse(saved);
        if (pos && typeof pos.x === "number" && typeof pos.y === "number") {
          setPosition(pos);
        }
      } catch {
        // ignore
      }
    }
  }, []);

  // Default: place next to ContainerInfoWidget if available, otherwise near left.
  useEffect(() => {
    if (position.x > 0 || position.y > 0) return;
    const raw = localStorage.getItem("containerInfoWidgetPosition");
    if (!raw) return;
    try {
      const infoPos = JSON.parse(raw);
      if (!infoPos || typeof infoPos.x !== "number" || typeof infoPos.y !== "number") return;
      const x = Math.max(0, infoPos.x + 230);
      const y = Math.max(0, infoPos.y);
      setPosition({ x, y });
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (e?.detail?.name !== "delivery") return;
      setOpen(true);
    };
    window.addEventListener("bsc:open-widget", handler);
    return () => window.removeEventListener("bsc:open-widget", handler);
  }, []);

  const handleMouseDown = (e) => {
    if (!e.target.closest(".drag-handle")) return;
    e.preventDefault();
    setIsDragging(true);
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      setDragStart({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e) => {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      const maxX = window.innerWidth - (buttonRef.current?.offsetWidth || 200);
      const maxY = window.innerHeight - (buttonRef.current?.offsetHeight || 60);
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    };
    const handleMouseUp = () => {
      setIsDragging(false);
      try {
        localStorage.setItem(
          "deliveryRequestWidgetPosition",
          JSON.stringify({ x: position.x, y: position.y })
        );
      } catch {
        // ignore
      }
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragStart.x, dragStart.y, position.x, position.y]);

  const hasCustomPosition = position.x > 0 || position.y > 0;
  const buttonStyle = hasCustomPosition
    ? {
        position: "fixed",
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: "none",
        bottom: "auto",
        right: "auto",
      }
    : undefined;

  return (
    <>
      {!launcherHidden && (
        <button
          ref={buttonRef}
          onClick={() => {
            if (!isDragging) setOpen((v) => !v);
          }}
          onMouseDown={handleMouseDown}
          style={buttonStyle}
          className={`hidden md:flex fixed z-[1100] items-center gap-2 rounded-full bg-gradient-to-r from-gray-500 to-gray-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xl ring-2 ring-amber-400/70 transition hover:from-gray-600 hover:to-gray-700 md:px-5 md:py-3 ${
            !hasCustomPosition ? "bottom-5 left-4 md:left-[29rem]" : ""
          } ${isDragging ? "scale-95 opacity-80" : "hover:scale-105"} cursor-move`}
          aria-label="Delivery — coming soon"
        >
          <FaGripVertical className="drag-handle text-base opacity-70 md:text-lg" />
          <span className="relative inline-flex shrink-0">
            <FaMotorcycle className="text-base md:text-lg" />
            <FaLock
              className="absolute -bottom-1 -right-1 rounded-full bg-amber-100 p-0.5 text-[10px] text-amber-900 shadow"
              aria-hidden
            />
          </span>
          <span className="hidden sm:inline">Delivery</span>
        </button>
      )}

      {open && (
        <>
          <div
            className="fixed inset-0 z-[1099] bg-black/30 backdrop-blur-md"
            onClick={() => setOpen(false)}
          />
          <div
            className="fixed top-1/2 left-1/2 z-[1100] flex max-h-[90vh] w-[94%] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delivery-widget-title"
          >
            <div className="flex items-center justify-between border-b border-gray-200 bg-gradient-to-r from-gray-600 to-gray-700 px-5 py-4 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-white/15 p-2">
                  <FaLock className="text-lg text-white" />
                </div>
                <div>
                  <p id="delivery-widget-title" className="text-sm font-bold text-white">
                    Delivery
                  </p>
                  <p className="text-xs text-gray-200">Not available now — coming soon</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-2 text-white transition-colors hover:bg-white/20"
                aria-label="Close"
              >
                <FaTimes />
              </button>
            </div>

            <div className="widget-scrollable min-h-0 flex-1 overflow-y-auto px-5 py-6">
              <DeliveryComingSoonContent compact />
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default DeliveryRequestWidget;
