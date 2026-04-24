import React, { useEffect, useRef, useState } from "react";
import { FaMotorcycle, FaTimes, FaGripVertical } from "react-icons/fa";
import ProfileCustomerDelivery from "./profile/ProfileCustomerDelivery";
import ProfileRiderWorkspace from "./profile/ProfileRiderWorkspace";
import API, { CACHE_DURATION } from "../api";

const DeliveryRequestWidget = ({ launcherHidden = false } = {}) => {
  const [open, setOpen] = useState(false);
  const [isRider, setIsRider] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const buttonRef = useRef(null);

  useEffect(() => {
    // Quick local check first.
    try {
      const ud = JSON.parse(localStorage.getItem("userData") || "{}");
      if (typeof ud?.is_rider === "boolean") {
        setIsRider(ud.is_rider);
        return;
      }
    } catch {
      // ignore
    }

    // Fallback to backend.
    const token = localStorage.getItem("token");
    if (!token) return;
    API.get("/buysellapi/users/me/", { cacheDuration: CACHE_DURATION.SHORT })
      .then((resp) => {
        const d = resp?.data || {};
        if (typeof d?.is_rider === "boolean") setIsRider(d.is_rider);
      })
      .catch(() => {});
  }, []);

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

  // Allow opening via the mobile "mother" widget hub.
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
          className={`hidden md:flex fixed z-[1100] items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 px-4 py-2.5 md:px-5 md:py-3 text-sm font-semibold text-white shadow-xl transition-all cursor-move ${
            !hasCustomPosition ? "bottom-5 left-4 md:left-[29rem]" : ""
          } ${isDragging ? "opacity-80 scale-95" : "hover:scale-105"}`}
          aria-label="Open delivery"
        >
          <FaGripVertical className="text-base md:text-lg drag-handle opacity-70" />
          <FaMotorcycle className="text-base md:text-lg" />
          <span className="hidden sm:inline">Delivery</span>
        </button>
      )}

      {open && (
        <>
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-md z-[1099]"
            onClick={() => setOpen(false)}
          />
          <div
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[94%] max-w-4xl h-[92vh] max-h-[92vh] z-[1100] rounded-2xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delivery-widget-title"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-pink-600 to-fuchsia-600">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <FaMotorcycle className="text-white text-lg" />
                </div>
                <div>
                  <p id="delivery-widget-title" className="text-sm font-bold text-white">
                    {isRider ? "Rider deliveries" : "Request rider delivery"}
                  </p>
                  <p className="text-xs text-pink-100">
                    {isRider
                      ? "Manage assigned jobs, share live GPS, confirm OTP"
                      : "Submit request, track rider, OTP confirmation"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
                aria-label="Close"
              >
                <FaTimes />
              </button>
            </div>

            <div className="flex-1 overflow-hidden bg-white dark:bg-gray-900">
              <div className="h-full overflow-y-auto px-5 py-5">
                {isRider ? <ProfileRiderWorkspace /> : <ProfileCustomerDelivery />}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default DeliveryRequestWidget;

