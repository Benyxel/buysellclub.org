import React, { useEffect, useRef, useState } from "react";
import { FaMotorcycle, FaGripVertical } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const DeliveryHomeWidget = ({ launcherHidden = false } = {}) => {
  const navigate = useNavigate();
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const buttonRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem("deliveryHomeWidgetPosition");
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

  // If no saved position, place next to ContainerShipmentWidget (approx).
  useEffect(() => {
    if (position.x > 0 || position.y > 0) return;
    const raw = localStorage.getItem("containerShipmentWidgetPosition_v2");
    if (!raw) return;
    try {
      const shipPos = JSON.parse(raw);
      if (!shipPos || typeof shipPos.x !== "number" || typeof shipPos.y !== "number") return;
      const x = Math.max(0, shipPos.x + 230);
      const y = Math.max(0, shipPos.y);
      setPosition({ x, y });
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          "deliveryHomeWidgetPosition",
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

  // Allow opening via the mobile "mother" widget hub.
  useEffect(() => {
    const handler = (e) => {
      if (e?.detail?.name !== "delivery") return;
      navigate("/Profile?tab=delivery");
    };
    window.addEventListener("bsc:open-widget", handler);
    return () => window.removeEventListener("bsc:open-widget", handler);
  }, [navigate]);

  if (launcherHidden) return null;

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
    <button
      ref={buttonRef}
      onClick={() => {
        if (!isDragging) navigate("/Profile?tab=delivery");
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
  );
};

export default DeliveryHomeWidget;

