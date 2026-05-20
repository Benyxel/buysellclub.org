import React, { useEffect, useRef, useState } from "react";
import { FaLayerGroup, FaShip, FaInfoCircle, FaMotorcycle, FaTimes, FaLock } from "react-icons/fa";

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
            className="flex h-12 items-center gap-2 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 px-5 text-sm font-semibold text-white shadow-xl transition-all hover:from-blue-600 hover:to-blue-700"
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
            className="flex h-12 items-center gap-2 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 px-5 text-sm font-semibold text-white shadow-xl transition-all hover:from-blue-600 hover:to-blue-700"
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
            className="flex h-12 items-center gap-2 rounded-full bg-gradient-to-r from-gray-500 to-gray-600 px-5 text-sm font-semibold text-white shadow-xl ring-2 ring-amber-400/60 transition-all hover:from-gray-600 hover:to-gray-700"
          >
            <span className="relative inline-flex shrink-0">
              <FaMotorcycle className="text-white" />
              <FaLock
                className="absolute -bottom-0.5 -right-1 rounded-full bg-amber-100 p-px text-[9px] text-amber-900"
                aria-hidden
              />
            </span>
            Delivery
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-12 items-center gap-2 rounded-full bg-gradient-to-r from-pink-600 to-fuchsia-600 px-5 text-sm font-semibold text-white shadow-xl transition-all hover:from-pink-700 hover:to-fuchsia-700"
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

