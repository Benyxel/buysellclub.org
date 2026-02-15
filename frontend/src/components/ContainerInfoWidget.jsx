import React, { useState, useEffect, useRef } from "react";
import { FaInfoCircle, FaTimes, FaShip, FaBoxes, FaYenSign, FaGripVertical, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { Link } from "react-router-dom";
import { Api } from "../api";

const ContainerInfoWidget = () => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [containerInfo, setContainerInfo] = useState({
    containerNumber: null,
    totalCbm: 0,
    rmbRate: null,
    shippingRate: null,
    status: null,
    containerId: null,
    notes: "",
  });
  const [containers, setContainers] = useState([]);
  const [currentContainerIndex, setCurrentContainerIndex] = useState(0);
  const buttonRef = useRef(null);

  // Load saved position from localStorage
  useEffect(() => {
    const savedPosition = localStorage.getItem("containerInfoWidgetPosition");
    if (savedPosition) {
      try {
        const pos = JSON.parse(savedPosition);
        setPosition(pos);
      } catch (e) {
        console.error("Failed to parse saved position:", e);
      }
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchContainersList();
    }
  }, [open]);

  useEffect(() => {
    if (open && containers.length > 0 && currentContainerIndex >= 0) {
      fetchContainerInfo();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, currentContainerIndex, containers.length]);

  // Handle drag start
  const handleMouseDown = (e) => {
    if (e.target.closest("button") && !e.target.closest(".drag-handle")) {
      return; // Don't drag if clicking the button itself (unless on drag handle)
    }
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

  // Handle dragging
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      
      // Constrain to viewport
      const maxX = window.innerWidth - (buttonRef.current?.offsetWidth || 200);
      const maxY = window.innerHeight - (buttonRef.current?.offsetHeight || 60);
      
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      // Save position to localStorage
      const currentPos = {
        x: position.x,
        y: position.y,
      };
      localStorage.setItem("containerInfoWidgetPosition", JSON.stringify(currentPos));
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragStart, position]);

  const fetchContainersList = async () => {
    try {
      const response = await Api.containers.list();
      const containersList = response?.data || [];
      // Filter to only show preparing and loading containers (backend should already filter, but double-check)
      const filteredContainers = containersList.filter(
        c => c.status === "preparing" || c.status === "loading"
      );
      setContainers(filteredContainers);
      
      // Find the index of the current loading container or most recent
      if (filteredContainers.length > 0) {
        const loadingIndex = filteredContainers.findIndex(c => c.status === "loading");
        setCurrentContainerIndex(loadingIndex >= 0 ? loadingIndex : 0);
      } else {
        setCurrentContainerIndex(0);
      }
    } catch (error) {
      console.error("Error fetching containers list:", error);
      setContainers([]);
      setCurrentContainerIndex(0);
    }
  };

  const fetchContainerInfo = async () => {
    if (containers.length === 0) return;
    
    setLoading(true);
    try {
      const currentContainer = containers[currentContainerIndex];
      const containerId = currentContainer?.id;
      
      // Fetch container info from public endpoint using Api client
      const containerResponse = await Api.containers.current(
        containerId ? { container_id: containerId } : {}
      );
      
      const containerNumber = containerResponse?.data?.container_number || "N/A";
      const totalCbm = containerResponse?.data?.total_cbm || "0.000";
      const containerStatus = containerResponse?.data?.status || null;
      const containerIdFromResponse = containerResponse?.data?.container_id || null;
      const containerNotes = containerResponse?.data?.notes || "";

      // Fetch current RMB rate from Alipay management (set by admin)
      let rmbRate = null;
      try {
        const rateResponse = await Api.alipay.rate();
        if (rateResponse?.data?.ghs_to_cny) {
          // Display GHS to CNY rate (1 GHS = X CNY) - showing rate in CNY, not converting to cedis
          rmbRate = parseFloat(rateResponse.data.ghs_to_cny);
        }
      } catch (error) {
        console.error("Error fetching RMB rate from Alipay management:", error);
      }

      // Fetch current shipping rate
      let shippingRate = null;
      try {
        const shippingRateResponse = await Api.shipping.adRate();
        if (shippingRateResponse?.data?.normal_goods_rate) {
          shippingRate = parseFloat(shippingRateResponse.data.normal_goods_rate);
        }
      } catch (error) {
        console.error("Error fetching shipping rate:", error);
      }

      setContainerInfo({
        containerNumber,
        totalCbm,
        rmbRate: rmbRate ? rmbRate.toFixed(3) : null,
        shippingRate: shippingRate ? shippingRate.toFixed(2) : null,
        status: containerStatus,
        containerId: containerIdFromResponse,
        notes: containerNotes,
      });
    } catch (error) {
      console.error("Error fetching container info:", error);
      setContainerInfo({
        containerNumber: "N/A",
        totalCbm: "0.000",
        rmbRate: null,
        shippingRate: null,
        status: null,
        notes: "",
      });
    } finally {
      setLoading(false);
    }
  };

  const infoContainer = (
    <>
      {/* Blurred backdrop */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-md z-[1099]"
        onClick={() => setOpen(false)}
        style={{
          animation: "fadeIn 0.3s ease-out",
        }}
      />
      {/* Centered popup */}
      <div 
        className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md md:w-96 lg:w-[28rem] z-[1100] rounded-2xl bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 shadow-2xl border border-gray-200 dark:border-gray-700"
        style={{
          animation: "fadeInScale 0.3s ease-out",
        }}
      >
        <style>{`
          @keyframes fadeIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }
          @keyframes fadeInScale {
            from {
              opacity: 0;
              transform: translate(-50%, -50%) scale(0.95);
            }
            to {
              opacity: 1;
              transform: translate(-50%, -50%) scale(1);
            }
          }
        `}</style>
       <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-500 to-purple-600 rounded-t-2xl">
         <div className="flex items-center gap-3">
           <div className="p-2 bg-white/20 rounded-lg">
             <FaShip className="text-white text-lg" />
           </div>
           <div>
             <p className="text-sm font-bold text-white">
               Next Container Shipment
             </p>
             <p className="text-xs text-purple-100">Real-time updates</p>
           </div>
         </div>
        <button
          onClick={() => setOpen(false)}
          className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
          aria-label="Close info"
        >
          <FaTimes />
        </button>
      </div>
      <div className="px-5 py-5 bg-white dark:bg-gray-800 rounded-b-2xl">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Loading info...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Current Loading Container */}
            <div className="relative p-4 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 border-2 border-blue-200 dark:border-blue-700 shadow-lg hover:shadow-xl transition-shadow">
              <div className="absolute top-2 right-2 w-16 h-16 bg-blue-200/30 dark:bg-blue-700/30 rounded-full blur-xl"></div>
              <div className="flex items-center justify-between mb-2 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500 rounded-lg">
                    <FaShip className="text-white text-sm" />
                  </div>
                  <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide">
                    {containers.length > 1 ? "Container" : "Current Loading Container"}
                  </p>
                </div>
                {containers.length > 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const newIndex = currentContainerIndex > 0 
                          ? currentContainerIndex - 1 
                          : containers.length - 1;
                        setCurrentContainerIndex(newIndex);
                      }}
                      className="p-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                      aria-label="Previous container"
                    >
                      <FaChevronLeft className="text-xs" />
                    </button>
                    <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                      {currentContainerIndex + 1} / {containers.length}
                    </span>
                    <button
                      onClick={() => {
                        const newIndex = currentContainerIndex < containers.length - 1 
                          ? currentContainerIndex + 1 
                          : 0;
                        setCurrentContainerIndex(newIndex);
                      }}
                      className="p-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                      aria-label="Next container"
                    >
                      <FaChevronRight className="text-xs" />
                    </button>
                  </div>
                )}
              </div>
               <p className="text-2xl font-bold text-blue-900 dark:text-blue-100 relative z-10">
                 CTN NO: {containerInfo.containerNumber || "N/A"}
               </p>
              {(containerInfo.status || containerInfo.notes) && (
                <div className="mt-2 relative z-10 flex flex-wrap items-center gap-2">
                  {containerInfo.status && (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      containerInfo.status === "loading" 
                        ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                        : containerInfo.status === "in_transit"
                        ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                        : containerInfo.status === "arrived"
                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                        : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                    }`}>
                      {containerInfo.status.charAt(0).toUpperCase() + containerInfo.status.slice(1).replace("_", " ")}
                    </span>
                  )}
                  {containerInfo.notes && (
                    <span className="text-xs font-semibold text-red-600 dark:text-red-400 bg-white dark:bg-gray-800 px-2 py-0.5 rounded">
                      {containerInfo.notes}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Total CBM */}
            <div className="relative p-4 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 border-2 border-green-200 dark:border-green-700 shadow-lg hover:shadow-xl transition-shadow">
              <div className="absolute top-2 right-2 w-16 h-16 bg-green-200/30 dark:bg-green-700/30 rounded-full blur-xl"></div>
              <div className="flex items-center gap-3 mb-2 relative z-10">
                <div className="p-2 bg-green-500 rounded-lg">
                  <FaBoxes className="text-white text-sm" />
                </div>
                <p className="text-xs font-semibold text-green-700 dark:text-green-300 uppercase tracking-wide">
                  Total CBM
                </p>
              </div>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100 relative z-10">
                {containerInfo.totalCbm || "0.000"} <span className="text-lg text-green-600 dark:text-green-400">CBM</span>
              </p>
            </div>

            {/* Current RMB Rate and Shipping Rate */}
            {(containerInfo.rmbRate || containerInfo.shippingRate) && (
              <div className="relative p-4 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 border-2 border-purple-200 dark:border-purple-700 shadow-lg hover:shadow-xl transition-shadow">
                <div className="absolute top-2 right-2 w-16 h-16 bg-purple-200/30 dark:bg-purple-700/30 rounded-full blur-xl"></div>
                <div className="flex items-center justify-between mb-2 relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500 rounded-lg">
                      <FaYenSign className="text-white text-sm" />
                    </div>
                    <p className="text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wide">
                      Current RMB Rate
                    </p>
                  </div>
                  {containerInfo.shippingRate && (
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wide">
                        Shipping Rate
                      </p>
                      <div className="p-2 bg-blue-500 rounded-lg">
                        <FaShip className="text-white text-xs" />
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between relative z-10">
                  <div>
                    {containerInfo.rmbRate && (
                      <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                        <span className="text-purple-600 dark:text-purple-400">{containerInfo.rmbRate}</span> CNY
                      </p>
                    )}
                    {containerInfo.rmbRate && (
                      <Link
                        to="/AlipayPayment"
                        onClick={() => setOpen(false)}
                        className="mt-2 inline-block text-xs text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 underline transition-colors"
                      >
                        Make Alipay Payment →
                      </Link>
                    )}
                  </div>
                  {containerInfo.shippingRate && (
                    <div className="text-right">
                      <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                        <span className="text-blue-600 dark:text-blue-400">${containerInfo.shippingRate}</span>
                        <span className="text-lg text-blue-600 dark:text-blue-400">/CBM</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
    </>
  );

  // Calculate button position
  // On mobile, center horizontally; on desktop, use saved position or default bottom-left
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
    : {}; // Use CSS classes for default positioning

  return (
    <>
      {open && infoContainer}
      <button
        ref={buttonRef}
        onClick={(e) => {
          if (!isDragging) {
            setOpen(!open);
          }
        }}
        onMouseDown={handleMouseDown}
        className={`fixed z-[1100] flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 px-4 py-2.5 md:px-5 md:py-3 text-sm font-semibold text-white shadow-xl transition-all cursor-move ${
          !hasCustomPosition 
            ? "bottom-5 left-1/2 -translate-x-1/2 md:left-4 md:translate-x-0" 
            : ""
        } ${isDragging ? "opacity-80 scale-95" : "hover:scale-105"}`}
        style={hasCustomPosition ? buttonStyle : undefined}
        aria-label="Open container info"
      >
        <FaGripVertical className="text-base md:text-lg drag-handle opacity-70" />
        <FaInfoCircle className="text-base md:text-lg" />
        <span className="hidden sm:inline">Shipping Info</span>
      </button>
    </>
  );
};

export default ContainerInfoWidget;


