import React, { useEffect, useRef, useState } from "react";
import { FaLayerGroup, FaShip, FaInfoCircle, FaMotorcycle, FaTimes } from "react-icons/fa";

function dispatchOpen(name) {
  window.dispatchEvent(new CustomEvent("bsc:open-widget", { detail: { name } }));
}

const HomeWidgetsHub = () => {
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (!panelRef.current) return;
      if (!panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div className="md:hidden fixed bottom-5 left-4 translate-x-0 z-[1200]">
      {open && (
        <div
          ref={panelRef}
          className="mb-3 flex flex-col gap-2 items-stretch"
          role="menu"
          aria-label="Quick widgets"
        >
          <button
            type="button"
            onClick={() => {
              dispatchOpen("containers");
              setOpen(false);
            }}
            className="flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 px-5 py-3 text-sm font-semibold text-white shadow-xl transition-all"
          >
            <FaShip className="text-white" />
            Containers
          </button>
          <button
            type="button"
            onClick={() => {
              dispatchOpen("shippingInfo");
              setOpen(false);
            }}
            className="flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 px-5 py-3 text-sm font-semibold text-white shadow-xl transition-all"
          >
            <FaInfoCircle className="text-white" />
            Shipping info
          </button>
          <button
            type="button"
            onClick={() => {
              dispatchOpen("delivery");
              setOpen(false);
            }}
            className="flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 px-5 py-3 text-sm font-semibold text-white shadow-xl transition-all"
          >
            <FaMotorcycle className="text-white" />
            Delivery
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full bg-gradient-to-r from-gray-900 to-gray-800 hover:from-black hover:to-gray-900 text-white shadow-xl px-5 py-3 text-sm font-semibold transition-all"
        aria-expanded={open}
        aria-label="Open quick widgets"
      >
        {open ? <FaTimes /> : <FaLayerGroup />}
        <span>Quick</span>
      </button>
    </div>
  );
};

export default HomeWidgetsHub;

