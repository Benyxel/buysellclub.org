import React, { useEffect, useRef, useState } from "react";
import { FaMotorcycle, FaGripVertical, FaLock } from "react-icons/fa";
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
      navigate("/Delivery");
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
        if (!isDragging) navigate("/Delivery");
      }}
      onMouseDown={handleMouseDown}
      style={buttonStyle}
      className={`hidden md:flex fixed z-[1100] cursor-move items-center gap-2 rounded-full bg-gradient-to-r from-gray-500 to-gray-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xl ring-2 ring-amber-400/70 transition-all hover:from-gray-600 hover:to-gray-700 md:px-5 md:py-3 ${
        !hasCustomPosition ? "bottom-5 left-4 md:left-[29rem]" : ""
      } ${isDragging ? "scale-95 opacity-80" : "hover:scale-105"}`}
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
  );
};

export default DeliveryHomeWidget;

