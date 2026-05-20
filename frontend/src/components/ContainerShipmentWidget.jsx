import React, { useEffect, useMemo, useRef, useState } from "react";
import { FaShip, FaTimes, FaGripVertical } from "react-icons/fa";
import API from "../api";
import atPortStatusIcon from "../assets/image.png";
import ladenStatusIcon from "../assets/laden.png";
import vesselIcon from "../assets/vessel.png";

const ORIGIN_PORT = "Nansha Port";
const DEST_PORT = "Tema Port";

function clamp01(n) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function parseISODate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDateShort(d) {
  try {
    return d ? d.toLocaleDateString() : "Not set";
  } catch {
    return "Not set";
  }
}

function daysUntil(date) {
  if (!date) return null;
  const ms = date.getTime() - Date.now();
  const days = Math.ceil(ms / (24 * 60 * 60 * 1000));
  return days;
}

function calcProgress({ departureDate, arrivalDate }) {
  const dep = parseISODate(departureDate);
  const arr = parseISODate(arrivalDate);
  if (!dep || !arr) return null;
  const total = arr.getTime() - dep.getTime();
  if (total <= 0) return null;
  const now = Date.now();
  return clamp01((now - dep.getTime()) / total);
}

function WaveStrip({ fill = "rgba(59,130,246,0.25)", className = "" }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1440 320"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path fill={fill} fillOpacity="1" d="M0,96L48,112C96,128,192,160,288,160C384,160,480,128,576,112C672,96,768,96,864,112C960,128,1056,160,1152,160C1248,160,1344,128,1392,112L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z">
        <animate
          attributeName="d"
          dur="3s"
          repeatCount="indefinite"
          values="M0,96L48,112C96,128,192,160,288,160C384,160,480,128,576,112C672,96,768,96,864,112C960,128,1056,160,1152,160C1248,160,1344,128,1392,112L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z;M0,64L48,80C96,96,192,128,288,128C384,128,480,96,576,80C672,64,768,64,864,80C960,96,1056,128,1152,128C1248,128,1344,96,1392,80L1440,64L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z;M0,96L48,112C96,128,192,160,288,160C384,160,480,128,576,112C672,96,768,96,864,112C960,128,1056,160,1152,160C1248,160,1344,128,1392,112L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
        />
      </path>
    </svg>
  );
}

function WaveProgressBar({
  progressPct,
  indeterminate,
  heightClass = "h-8",
}) {
  const widthPct = indeterminate ? 40 : Math.max(2, progressPct ?? 0);
  return (
    <div
      className={`relative ${heightClass} rounded-full overflow-hidden bg-blue-100/60 dark:bg-blue-900/20 border border-blue-200/60 dark:border-blue-800/40`}
    >
      {/* Base water */}
      <div className="absolute inset-0">
        <WaveStrip
          fill="rgba(59,130,246,0.25)"
          className="w-full h-full opacity-90"
        />
      </div>
      {/* Progress water overlay */}
      <div
        className={
          indeterminate
            ? "absolute inset-y-0 left-0 animate-[containerWaveSweep_2.2s_ease-in-out_infinite]"
            : "absolute inset-y-0 left-0"
        }
        style={{ width: `${widthPct}%` }}
      >
        <WaveStrip
          fill="rgba(37,99,235,0.65)"
          className="w-full h-full"
        />
      </div>
    </div>
  );
}

/**
 * Compact Nansha → Tema animation with arrival date and days left (for inline cards).
 */
export function TemaPortVoyageMini({
  departureDate,
  arrivalDate,
  containerNumber,
  className = "",
}) {
  const progress = calcProgress({
    departureDate,
    arrivalDate,
  });
  const arr = parseISODate(arrivalDate);
  const pct = progress == null ? null : Math.round(progress * 100);
  const daysLeft = daysUntil(arr);
  const shipLeft = progress == null ? 0.08 : progress;
  const isAtPort = arr != null && daysLeft <= 0;
  const noEta = arr == null;

  const countdownLabel =
    noEta
      ? "Laden"
      : isAtPort
        ? "Docked"
        : daysLeft === 1
          ? "1 day to Tema Port"
          : `${daysLeft} days to Tema Port`;

  const containerLabel =
    containerNumber != null && String(containerNumber).trim() !== ""
      ? String(containerNumber).trim()
      : null;

  return (
    <>
      <style>{`
        @keyframes shipBob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        @keyframes containerWaveSweep {
          0% { transform: translateX(-70%); }
          50% { transform: translateX(60%); }
          100% { transform: translateX(140%); }
        }
      `}</style>
      <div
        className={`rounded-xl border border-blue-200/60 dark:border-blue-800/50 bg-gradient-to-br from-slate-50 to-blue-50/90 dark:from-gray-900/90 dark:to-blue-950/50 px-3 py-2 shadow-inner ${className}`}
      >
        <div
          className={`mb-1.5 flex min-w-0 flex-nowrap items-baseline gap-2 ${
            containerLabel ? "justify-between" : "justify-end"
          }`}
        >
          {containerLabel && (
            <span
              className="min-w-0 max-w-[58%] truncate text-left text-xs font-bold leading-tight text-gray-900 dark:text-white sm:text-sm font-mono"
              title={containerLabel}
            >
              {containerLabel}
            </span>
          )}
          <p
            className={`shrink-0 text-right text-[10px] font-semibold uppercase leading-none tracking-wide text-gray-500 dark:text-gray-400 ${
              containerLabel ? "max-w-[42%] truncate pl-1" : ""
            }`}
            title={`${ORIGIN_PORT} → ${DEST_PORT}`}
          >
            {ORIGIN_PORT} → {DEST_PORT}
          </p>
        </div>
        <div className="relative h-7 mb-1.5">
          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2">
            <WaveProgressBar
              heightClass="h-7"
              indeterminate={progress == null}
              progressPct={pct ?? 0}
            />
          </div>
          <div
            className={`absolute top-1/2 z-[1] -translate-y-1/2 ${
              isAtPort
                ? "right-1 max-w-[min(72px,28%)]"
                : noEta
                  ? "left-1 max-w-[min(72px,30%)]"
                  : "origin-center scale-[0.5]"
            }`}
            style={
              isAtPort
                ? { transition: "right 600ms ease" }
                : noEta
                  ? undefined
                  : {
                      left: `calc(${shipLeft * 100}% - 16px)`,
                      transition: "left 600ms ease",
                    }
            }
          >
            {isAtPort ? (
              <img
                src={atPortStatusIcon}
                alt="Docked"
                className="h-7 w-auto max-h-7 object-contain object-right drop-shadow-sm"
                width={72}
                height={28}
              />
            ) : noEta ? (
              <img
                src={ladenStatusIcon}
                alt="Laden"
                className="h-7 w-auto max-h-7 object-contain object-left drop-shadow-sm"
                width={72}
                height={28}
              />
            ) : (
              <img
                src={vesselIcon}
                alt=""
                className="h-7 w-auto max-h-7 object-contain drop-shadow-sm animate-[shipBob_2.2s_ease-in-out_infinite]"
                width={72}
                height={40}
                aria-hidden="true"
              />
            )}
          </div>
        </div>
        {noEta ? (
          <div className="flex items-center justify-center gap-1.5 overflow-hidden text-center leading-tight">
            <img
              src={ladenStatusIcon}
              alt=""
              className="h-4 w-4 shrink-0 object-contain sm:h-5 sm:w-5"
              width={20}
              height={20}
              aria-hidden="true"
            />
            <span className="text-xs font-semibold text-amber-800 dark:text-amber-200 sm:text-sm">
              Laden
            </span>
          </div>
        ) : (
          <div className="flex min-w-0 flex-nowrap items-center justify-center gap-x-1.5 overflow-hidden text-center leading-tight">
            <span className="min-w-0 truncate text-xs font-bold text-gray-900 dark:text-white sm:text-sm">
              {formatDateShort(arr)}
            </span>
            <span
              className="shrink-0 text-gray-300 dark:text-gray-600 select-none"
              aria-hidden="true"
            >
              ·
            </span>
            <span
              className={`shrink-0 text-xs font-semibold ${
                isAtPort
                  ? "text-emerald-700 dark:text-emerald-400"
                  : "text-blue-600 dark:text-blue-300"
              }`}
            >
              {countdownLabel}
            </span>
          </div>
        )}
      </div>
    </>
  );
}

const ContainerShipmentWidget = ({ launcherHidden = false } = {}) => {
  const [loading, setLoading] = useState(false);
  const [containers, setContainers] = useState([]);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const buttonRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const resp = await API.get("/buysellapi/containers/public/", {
          params: { for_tracking: true },
        });
        const items = Array.isArray(resp?.data) ? resp.data : [];
        if (!cancelled) setContainers(items);
      } catch {
        if (!cancelled) setContainers([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  // Allow opening via the mobile "mother" widget hub.
  useEffect(() => {
    const handler = (e) => {
      if (e?.detail?.name !== "containers") return;
      setOpen(true);
    };
    window.addEventListener("bsc:open-widget", handler);
    return () => window.removeEventListener("bsc:open-widget", handler);
  }, []);

  // Load saved position (similar to ContainerInfoWidget)
  useEffect(() => {
    const saved = localStorage.getItem("containerShipmentWidgetPosition_v2");
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

  // If Shipment widget has no saved position, place it next to Shipping Info widget
  useEffect(() => {
    // only when we have no custom position
    if (position.x > 0 || position.y > 0) return;
    const raw = localStorage.getItem("containerInfoWidgetPosition");
    if (!raw) return;
    try {
      const infoPos = JSON.parse(raw);
      if (!infoPos || typeof infoPos.x !== "number" || typeof infoPos.y !== "number") return;
      // Place to the right of Shipping Info (approx width + gap)
      const x = Math.max(0, infoPos.x + 230);
      const y = Math.max(0, infoPos.y);
      setPosition({ x, y });
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMouseDown = (e) => {
    // Only drag when grabbing the handle
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
          "containerShipmentWidgetPosition_v2",
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

  // Containers shown in this widget: in_transit AND laden.
  // Laden = container is loaded but has not departed yet (no ETA), so it
  // re-uses the same icons/labels as an in_transit container with no ETA.
  const inTransit = useMemo(
    () =>
      containers.filter(
        (c) => c?.status === "in_transit" || c?.status === "laden"
      ),
    [containers]
  );

  // Match ContainerInfoWidget behavior: default pinned position until user drags
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
      {/* Floating launcher (same feel as ContainerInfoWidget) */}
      {!launcherHidden && (
        <button
          ref={buttonRef}
          onClick={() => {
            if (!isDragging) setOpen(!open);
          }}
          onMouseDown={handleMouseDown}
          style={buttonStyle}
          className={`hidden md:flex fixed z-[1100] items-center gap-2 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 px-4 py-2.5 md:px-5 md:py-3 text-sm font-semibold text-white shadow-xl transition-all cursor-move ${
            !hasCustomPosition
              ? "bottom-5 left-4 translate-x-0 md:left-56 md:translate-x-0"
              : ""
          } ${isDragging ? "opacity-80 scale-95" : "hover:scale-105"}`}
          aria-label="Open container shipment tracker"
        >
          <FaGripVertical className="text-base md:text-lg drag-handle opacity-70" />
          <FaShip className="text-base md:text-lg" />
          <span className="hidden sm:inline">Containers</span>
        </button>
      )}

      {open && (
        <>
          {/* Blurred backdrop (match ContainerInfoWidget) */}
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-md z-[1099]"
            onClick={() => setOpen(false)}
            style={{ animation: "fadeIn 0.3s ease-out" }}
          />
          {/* Centered popup */}
          <div
            className="fixed top-1/2 left-1/2 z-[1100] flex min-h-0 w-[92%] max-w-3xl -translate-x-1/2 -translate-y-1/2 transform flex-col overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 shadow-2xl max-h-[min(72dvh,calc(100dvh-6rem))] dark:border-gray-700 dark:from-gray-800 dark:to-gray-900 sm:max-h-[min(80dvh,calc(100dvh-4rem))] md:max-h-[min(88dvh,calc(100dvh-3rem))]"
            style={{ animation: "fadeInScale 0.3s ease-out" }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="container-shipment-widget-title"
          >
            <style>{`
              @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
              @keyframes fadeInScale {
                from { opacity: 0; transform: translate(-50%, -50%) scale(0.95); }
                to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
              }
            `}</style>

            <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 dark:border-gray-700 sm:px-5 sm:py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <FaShip className="text-white text-lg" />
                </div>
                <div>
                  <p
                    id="container-shipment-widget-title"
                    className="text-sm font-bold text-white"
                  >
                    Container Shipment Tracker
                  </p>
                  <p className="text-xs text-blue-100">
                    {ORIGIN_PORT} → {DEST_PORT}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
                aria-label="Close"
              >
                <FaTimes />
              </button>
            </div>

            <div className="shrink-0 border-b border-red-800/60 bg-red-600 px-4 py-2.5 dark:border-red-900/50 dark:bg-red-700 sm:py-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-white">
                Note
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-white/95 sm:text-xs">
                Fofoofo Import does not determine when a vessel or container arrives—the{" "}
                <span className="font-semibold text-white">shipping line</span> does. Every ETA shown
                here is an estimate; in practice ETAs often change (expect on the order of{" "}
                <span className="font-semibold text-white">~80%</span> likelihood of change).
              </p>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-white px-4 py-4 dark:bg-gray-800 sm:px-5 sm:py-5">
              {loading && (
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/20 p-5">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Loading in-transit containers…
                  </p>
                </div>
              )}

              {!loading && inTransit.length === 0 && (
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/20 p-5">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    No containers in transit right now.
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    When a container status is set to{" "}
                    <span className="font-semibold">Laden</span> or{" "}
                    <span className="font-semibold">In Transit</span>, it will
                    appear here automatically.
                  </p>
                </div>
              )}

              <div className="grid gap-5">
                {inTransit.map((c) => {
                const isLaden = c?.status === "laden";
                // For laden containers, ignore any arrival_date so the laden
                // icons/labels (the "no ETA" path) are used consistently.
                const arrivalForCalc = isLaden ? null : c.arrival_date;
                const progress = calcProgress({
                  departureDate: c.departure_date,
                  arrivalDate: arrivalForCalc,
                });
                const dep = parseISODate(c.departure_date);
                const arr = parseISODate(arrivalForCalc);
                const pct = progress == null ? null : Math.round(progress * 100);
                const daysLeft = daysUntil(arr);

                const shipLeft = progress == null ? 0.08 : progress;
                const isAtPort = arr != null && daysLeft <= 0;
                const noEta = arr == null;

                return (
                  <div
                    key={c.id ?? c.container_number}
                    className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/20 p-5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Container
                        </p>
                        <p className="text-base font-semibold text-gray-900 dark:text-white">
                          {c.container_number}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          ETA
                        </p>
                        {noEta ? (
                          <p className="mt-0.5 inline-flex items-center justify-end gap-1.5 text-sm font-semibold text-amber-800 dark:text-amber-200">
                            <img
                              src={ladenStatusIcon}
                              alt=""
                              className="h-5 w-5 object-contain"
                              width={20}
                              height={20}
                              aria-hidden="true"
                            />
                            Laden
                          </p>
                        ) : (
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            {formatDateShort(arr)}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-2">
                      <span className="font-semibold text-gray-800 dark:text-gray-200">
                        {ORIGIN_PORT}
                      </span>
                      <span className="font-semibold text-gray-800 dark:text-gray-200">
                        {DEST_PORT}
                      </span>
                    </div>

                    <div className="relative h-12">
                      <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2">
                        <WaveProgressBar
                          indeterminate={progress == null}
                          progressPct={pct ?? 0}
                        />
                      </div>

                      <div
                        className={`absolute top-1/2 -translate-y-1/2 ${
                          isAtPort
                            ? "right-2 max-w-[min(120px,36%)]"
                            : noEta
                              ? "left-2 max-w-[min(120px,36%)]"
                              : ""
                        }`}
                        style={
                          isAtPort || noEta
                            ? undefined
                            : {
                                left: `calc(${shipLeft * 100}% - 32px)`,
                                transition: "left 600ms ease",
                              }
                        }
                      >
                        {isAtPort ? (
                          <img
                            src={atPortStatusIcon}
                            alt="Docked"
                            className="h-12 w-auto max-h-12 object-contain object-right drop-shadow-sm"
                            width={120}
                            height={48}
                          />
                        ) : noEta ? (
                          <img
                            src={ladenStatusIcon}
                            alt="Laden"
                            className="h-12 w-auto max-h-12 object-contain object-left drop-shadow-sm"
                            width={120}
                            height={48}
                          />
                        ) : (
                          <img
                            src={vesselIcon}
                            alt=""
                            className="h-12 w-auto max-h-12 object-contain drop-shadow-sm animate-[shipBob_2.2s_ease-in-out_infinite]"
                            width={120}
                            height={48}
                            aria-hidden="true"
                          />
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-600 dark:text-gray-400">
                      <span>
                        Departure:{" "}
                        <span className="font-semibold text-gray-800 dark:text-gray-200">
                          {formatDateShort(dep)}
                        </span>
                      </span>
                      <span
                        className={`inline-flex items-center gap-1.5 font-semibold ${
                          noEta
                            ? "text-amber-800 dark:text-amber-200"
                            : "text-blue-700 dark:text-blue-200"
                        }`}
                      >
                        {arr ? (
                          isAtPort ? (
                            <>
                              <img
                                src={atPortStatusIcon}
                                alt=""
                                className="h-5 w-5 shrink-0 object-contain"
                                width={20}
                                height={20}
                                aria-hidden="true"
                              />
                              Docked
                            </>
                          ) : daysLeft === 1 ? (
                            "1 day to Tema"
                          ) : (
                            `${daysLeft} days to Tema`
                          )
                        ) : (
                          <>
                            <img
                              src={ladenStatusIcon}
                              alt=""
                              className="h-5 w-5 shrink-0 object-contain"
                              width={20}
                              height={20}
                              aria-hidden="true"
                            />
                            Laden
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                );
                })}
              </div>
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes shipBob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        @keyframes containerWaveSweep {
          0% { transform: translateX(-70%); }
          50% { transform: translateX(60%); }
          100% { transform: translateX(140%); }
        }
      `}</style>
    </>
  );
};

export default ContainerShipmentWidget;

