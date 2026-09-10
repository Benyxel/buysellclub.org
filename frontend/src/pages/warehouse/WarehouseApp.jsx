/**
 * FIMW Warehouse web scanner — same flows as the mobile app,
 * with typed tracking numbers (no camera).
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Api } from "../../api";
import { apiErrorMessage } from "../../utils/apiErrorMessage";
import WarehouseReceivedPackages from "./WarehouseReceivedPackages";
import "./warehouse-theme.css";
import {
  WarehouseI18nProvider,
  useWarehouseI18n,
  WAREHOUSE_LANGUAGES,
} from "./warehouseI18n";

const WAREHOUSE_THEME_KEY = "fimw-warehouse-theme";

function readWarehouseTheme() {
  try {
    const stored = localStorage.getItem(WAREHOUSE_THEME_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    /* ignore */
  }
  return "dark";
}

const MARK_PREFIXES = ["FIM", "BSC"];
const DEFAULT_MARK_PREFIX = "FIM";

const CHINA_ACTIONS = [
  {
    id: "received",
    labelKey: "received",
    hintKey: "receivedHint",
    tone: "success",
  },
  {
    id: "rejected",
    labelKey: "rejected",
    hintKey: "rejectedHint",
    tone: "danger",
  },
  {
    id: "returned",
    labelKey: "returned",
    hintKey: "returnedHint",
    tone: "amber",
  },
];

const emptyDraft = () => ({
  trackingNumber: "",
  markId: DEFAULT_MARK_PREFIX,
  fullName: "",
  containerNumber: "",
  heightCm: "",
  widthCm: "",
  lengthCm: "",
  productName: "",
  weightKg: "",
  reason: "",
});

const REJECT_RETURN_REASONS = [
  { value: "No Shipping Mark", labelKey: "reason_no_shipping_mark" },
  { value: "Broken", labelKey: "reason_broken" },
  { value: "Dangerous Goods", labelKey: "reason_dangerous_goods" },
  { value: "Prohibited / Restricted Goods", labelKey: "reason_prohibited_goods" },
  { value: "Battery / Liquid / Powder Restricted", labelKey: "reason_battery_liquid_powder" },
  { value: "Counterfeit / Brand Goods", labelKey: "reason_counterfeit_brand" },
  { value: "Insufficient Packaging", labelKey: "reason_insufficient_packaging" },
  { value: "Wet / Water Damaged", labelKey: "reason_wet_water_damage" },
  { value: "Overweight / Oversized for This Shipment", labelKey: "reason_overweight_oversized" },
  { value: "Missing Invoice / Documents", labelKey: "reason_missing_documents" },
  { value: "Wrong or Incomplete Mark / Address", labelKey: "reason_wrong_mark_or_address" },
  { value: "Customer Cancellation Request", labelKey: "reason_customer_cancelled" },
  { value: "Uncompressed Mattress", labelKey: "reason_uncompressed_mattress" },
  { value: "Swing Chair", labelKey: "reason_swing_chair" },
  { value: "Mannequin", labelKey: "reason_mannequin" },
];

/** Normalize Mark ID: FIM### (default) or BSC###. Digits alone → FIM + digits. */
function withMarkPrefix(raw) {
  const upper = String(raw || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  if (!upper) return DEFAULT_MARK_PREFIX;

  for (const prefix of MARK_PREFIXES) {
    if (upper.startsWith(prefix)) {
      return prefix + upper.slice(prefix.length).replace(/\D/g, "");
    }
  }
  for (const prefix of MARK_PREFIXES) {
    const at = upper.indexOf(prefix);
    if (at >= 0) {
      return prefix + upper.slice(at + prefix.length).replace(/\D/g, "");
    }
  }
  return DEFAULT_MARK_PREFIX + upper.replace(/\D/g, "");
}

function isTrackingToken(raw) {
  const value = String(raw || "").trim();
  if (value.length < 3 || value.length > 64) return false;
  if (
    /^\d+(?:[.,]\d+)?(?:[*xX×✕✖])\d+(?:[.,]\d+)?(?:[*xX×✕✖])\d+(?:[.,]\d+)?$/.test(
      value
    )
  ) {
    return false;
  }
  return /^[A-Za-z0-9][A-Za-z0-9#/*._-]*$/.test(value);
}

function isUsableMarkId(mark) {
  return /^(FIM|BSC)\d+$/i.test(String(mark || "").trim());
}

function markPrefixOf(mark) {
  const upper = String(mark || "").toUpperCase();
  for (const prefix of MARK_PREFIXES) {
    if (upper.startsWith(prefix)) return prefix;
  }
  return DEFAULT_MARK_PREFIX;
}

const MIN_PACKAGE_CBM = 0.001;

function calcCbm(h, w, l) {
  const height = Number(String(h || "").replace(",", "."));
  const width = Number(String(w || "").replace(",", "."));
  const length = Number(String(l || "").replace(",", "."));
  if (
    ![height, width, length].every((n) => Number.isFinite(n) && n > 0)
  ) {
    return "";
  }
  const raw = (height * width * length) / 1000000;
  if (!Number.isFinite(raw) || raw <= 0) return "";
  // Tiny packages round to 0.000 with 3 decimals and block submit — floor them.
  return Math.max(raw, MIN_PACKAGE_CBM).toFixed(3);
}

function parseDimensionTriplet(raw) {
  const text = String(raw || "").trim();
  if (!text) return null;
  const parts = text
    .split(/[*xX×✕✖/\-\s]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length !== 3) return null;
  const nums = parts.map((part) => Number(String(part).replace(",", ".")));
  if (!nums.every((n) => Number.isFinite(n) && n > 0)) return null;
  return {
    heightCm: String(nums[0]),
    widthCm: String(nums[1]),
    lengthCm: String(nums[2]),
  };
}

function sanitizeDimsInput(raw) {
  return String(raw || "")
    .replace(/[^0-9.,*xX×✕✖/\-\s]/g, "")
    .slice(0, 40);
}

/**
 * Parse a warehouse paste line:
 * 79137258956701 FIM752 0.9 10*10*20 clothes
 * Size and product may be glued: 10*10*20clothes
 */
function parseWarehouseReceivePaste(raw) {
  let text = String(raw || "").replace(/[\t,;]+/g, " ").replace(/\s+/g, " ").trim();
  if (!text) return null;

  text = text.replace(
    /(\d+(?:[.,]\d+)?\s*[*xX×✕✖]\s*\d+(?:[.,]\d+)?\s*[*xX×✕✖]\s*\d+(?:[.,]\d+)?)([A-Za-z])/g,
    "$1 $2"
  );

  const result = {
    trackingNumber: "",
    markId: "",
    weightKg: "",
    heightCm: "",
    widthCm: "",
    lengthCm: "",
    dimsText: "",
    productName: "",
  };

  const markMatch = text.match(/(?:^|\s)((?:FIM|BSC)\s*\d+)(?=\s|$)/i);
  if (markMatch) {
    const mark = withMarkPrefix(markMatch[1]);
    if (isUsableMarkId(mark)) result.markId = mark;
    text = `${text.slice(0, markMatch.index)} ${text.slice(markMatch.index + markMatch[0].length)}`;
  }

  const dimMatch = text.match(
    /(\d+(?:[.,]\d+)?)\s*[*xX×✕✖]\s*(\d+(?:[.,]\d+)?)\s*[*xX×✕✖]\s*(\d+(?:[.,]\d+)?)/
  );
  if (dimMatch) {
    const parsed = parseDimensionTriplet(
      `${dimMatch[1]}*${dimMatch[2]}*${dimMatch[3]}`
    );
    if (parsed) {
      Object.assign(result, parsed);
      result.dimsText = `${parsed.heightCm}*${parsed.widthCm}*${parsed.lengthCm}`;
    }
    text = `${text.slice(0, dimMatch.index)} ${text.slice(dimMatch.index + dimMatch[0].length)}`;
  }

  const tokens = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const leftover = [];
  for (const token of tokens) {
    if (!result.trackingNumber && isTrackingToken(token) && !isUsableMarkId(token)) {
      result.trackingNumber = token;
      continue;
    }
    const asNum = Number(String(token).replace(",", "."));
    if (!result.weightKg && Number.isFinite(asNum) && asNum > 0 && asNum < 10000) {
      result.weightKg = String(asNum);
      continue;
    }
    leftover.push(token);
  }
  result.productName = leftover.join(" ").trim();
  return result.trackingNumber ? result : null;
}

function formatDimensionTriplet(heightCm, widthCm, lengthCm) {
  const h = String(heightCm || "").trim();
  const w = String(widthCm || "").trim();
  const l = String(lengthCm || "").trim();
  if (!h && !w && !l) return "";
  if (h && w && l) return `${h}*${w}*${l}`;
  return [h, w, l].filter(Boolean).join("*");
}

function actionLabel(warehouse, action, t) {
  if (warehouse === "china") {
    const item = CHINA_ACTIONS.find((a) => a.id === action);
    return item ? t(item.labelKey) : action;
  }
  if (action === "picked_up") return t("pickedUp");
  return action || "—";
}

function toneClass(tone) {
  if (tone === "success") return "border-emerald-400/40 bg-emerald-500/10 text-emerald-300";
  if (tone === "danger") return "border-rose-400/40 bg-rose-500/10 text-rose-300";
  if (tone === "amber") return "border-amber-400/40 bg-amber-500/10 text-amber-300";
  if (tone === "teal") return "border-teal-400/40 bg-teal-500/10 text-teal-300";
  return "border-white/10 bg-white/5 text-slate-100";
}

function Shell({ children, title, subtitle, onBack, eyebrow, wide, actions }) {
  const { t } = useWarehouseI18n();
  return (
    <div
      className={`mx-auto w-full px-6 py-8 lg:px-10 lg:py-10 ${
        wide ? "max-w-6xl" : "max-w-5xl"
      }`}
    >
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-slate-300 hover:text-white"
            >
              ← {t("back")}
            </button>
          ) : null}
          {eyebrow ? (
            <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-amber-400">
              {eyebrow}
            </p>
          ) : null}
          {title ? (
            <h1 className="text-3xl font-black tracking-tight text-slate-50 lg:text-4xl">
              {title}
            </h1>
          ) : null}
          {subtitle ? (
            <p className="mt-2 max-w-2xl text-base leading-relaxed text-slate-400">
              {subtitle}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function ActionCard({ title, hint, tone, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-full w-full rounded-2xl border px-5 py-6 text-left transition hover:brightness-110 ${toneClass(
        tone
      )}`}
    >
      <div className="text-xl font-extrabold">{title}</div>
      {hint ? <div className="mt-2 text-sm leading-relaxed opacity-80">{hint}</div> : null}
    </button>
  );
}

function ActionGrid({ children }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {children}
    </div>
  );
}

function Panel({ children, className = "" }) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-[#121A2A] p-5 lg:p-6 ${className}`}
    >
      {children}
    </div>
  );
}

function Field({ label, hint, children, className = "" }) {
  return (
    <label className={`block space-y-1.5 ${className}`}>
      <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
        {label}
      </span>
      {hint ? <span className="block text-xs text-slate-500">{hint}</span> : null}
      {children}
    </label>
  );
}

function PrimaryButton({ children, className = "", ...props }) {
  return (
    <button
      type="button"
      className={`rounded-xl bg-amber-400 px-5 py-3.5 text-sm font-black text-[#0B1220] hover:bg-amber-300 disabled:opacity-60 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

function SecondaryButton({ children, className = "", ...props }) {
  return (
    <button
      type="button"
      className={`rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-slate-100 hover:bg-white/10 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

const inputClass =
  "w-full rounded-xl border border-white/10 bg-[#151D2E] px-3.5 py-3 text-base font-semibold text-slate-50 outline-none placeholder:text-slate-500 focus:border-amber-400/50 focus:ring-2 focus:ring-amber-400/20";

export default function WarehouseApp() {
  return (
    <WarehouseI18nProvider>
      <WarehouseAppInner />
    </WarehouseI18nProvider>
  );
}

function WarehouseAppInner() {
  const { t, language, setLanguage } = useWarehouseI18n();
  const [view, setView] = useState("home");
  const [warehouse, setWarehouse] = useState(null);
  const [action, setAction] = useState(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [lastResult, setLastResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const [containers, setContainers] = useState([]);
  const [containersLoading, setContainersLoading] = useState(false);
  const [markName, setMarkName] = useState("");
  const [markLoading, setMarkLoading] = useState(false);

  const [pickupDate, setPickupDate] = useState(
    () => new Date().toISOString().slice(0, 10)
  );
  const [pickupLog, setPickupLog] = useState(null);
  const [pickupByMark, setPickupByMark] = useState(null);
  const [invoicePickup, setInvoicePickup] = useState(null);
  const [invoicePickupSelected, setInvoicePickupSelected] = useState(() => new Set());
  const [invoicePickupContainer, setInvoicePickupContainer] = useState("");

  const [exportContainers, setExportContainers] = useState([]);
  const [exportContainer, setExportContainer] = useState("");
  const [uploadFile, setUploadFile] = useState(null);
  const [theme, setTheme] = useState(readWarehouseTheme);
  const [dimsInput, setDimsInput] = useState("");
  const [parkingContainers, setParkingContainers] = useState([]);
  const [parkingContainer, setParkingContainer] = useState("");
  const [parkingLoading, setParkingLoading] = useState(false);

  const applyTheme = (next) => {
    setTheme(next);
    try {
      localStorage.setItem(WAREHOUSE_THEME_KEY, next);
    } catch {
      /* ignore */
    }
  };

  const cbm = useMemo(
    () => calcCbm(draft.heightCm, draft.widthCm, draft.lengthCm),
    [draft.heightCm, draft.widthCm, draft.lengthCm]
  );

  const patch = useCallback((partial) => {
    setDraft((prev) => ({ ...prev, ...partial }));
  }, []);

  const applyDimsInput = useCallback(
    (raw) => {
      const next = sanitizeDimsInput(raw);
      setDimsInput(next);
      const parsed = parseDimensionTriplet(next);
      if (parsed) {
        patch(parsed);
      } else {
        patch({ heightCm: "", widthCm: "", lengthCm: "" });
      }
      setError("");
    },
    [patch]
  );

  const goHome = () => {
    setView("home");
    setWarehouse(null);
    setAction(null);
    setDraft(emptyDraft());
    setDimsInput("");
    setLastResult(null);
    setError("");
    setInfo("");
  };

  const openWarehouse = (id) => {
    setWarehouse(id);
    setAction(null);
    setDraft(emptyDraft());
    setLastResult(null);
    setError("");
    setInfo("");
    setView(id === "china" ? "china-home" : "ghana-home");
  };

  const startAction = (nextAction) => {
    setAction(nextAction);
    setDraft(emptyDraft());
    setError("");
    setInfo("");
    setView("tracking");
  };

  const startChinaNavAction = (nextAction) => {
    setWarehouse("china");
    startAction(nextAction);
  };

  const openReceivedPackages = () => {
    setError("");
    setInfo("");
    setAction(null);
    setWarehouse("china");
    setView("received-packages");
  };

  const loadReceivingContainers = useCallback(async () => {
    setContainersLoading(true);
    try {
      const list = await Api.containers.receivingList();
      setContainers(list);
      const current = String(draft.containerNumber || "").trim();
      if (current) {
        const row = list.find(
          (c) =>
            String(c.container_number || "").toUpperCase() ===
            current.toUpperCase()
        );
        const total = Number(row?.total_cbm);
        const max = Number(row?.max_cbm) || 78;
        const isFull =
          Boolean(row?.is_full) ||
          (Number.isFinite(total) && total >= max);
        if (isFull) {
          patch({ containerNumber: "" });
          setError(
            `Container ${current} is full (${
              Number.isFinite(total) ? total.toFixed(3) : "0"
            } / ${max} CBM). Please select the next container.`
          );
        }
      }
    } catch {
      setContainers([]);
    } finally {
      setContainersLoading(false);
    }
  }, [draft.containerNumber, patch]);

  useEffect(() => {
    if (view === "assign" && action === "received") {
      loadReceivingContainers();
    }
  }, [view, action, loadReceivingContainers]);

  useEffect(() => {
    if (view !== "assign") return;
    const mark = String(draft.markId || "").trim();
    if (!isUsableMarkId(mark)) {
      setMarkName("");
      patch({ fullName: "" });
      return;
    }
    let cancelled = false;
    setMarkName("");
    patch({ fullName: "" });
    setMarkLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await Api.scanner.markLookup(mark);
        if (cancelled) return;
        const name = res.data?.full_name || res.data?.name || "";
        setMarkName(name);
        patch({ fullName: name });
        if (!name) {
          setError(
            t("noUserForMarkShort")
          );
        }
      } catch {
        if (!cancelled) {
          setMarkName("");
          patch({ fullName: "" });
          setError(
            t("noUserForMarkShort")
          );
        }
      } finally {
        if (!cancelled) setMarkLoading(false);
      }
    }, 280);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [view, draft.markId, patch, t]);

  const applyReceivePaste = useCallback(
    (parsed) => {
      if (!parsed?.trackingNumber) return false;
      patch({
        trackingNumber: parsed.trackingNumber,
        ...(parsed.markId ? { markId: parsed.markId } : {}),
        ...(parsed.weightKg ? { weightKg: parsed.weightKg } : {}),
        ...(parsed.heightCm
          ? {
              heightCm: parsed.heightCm,
              widthCm: parsed.widthCm,
              lengthCm: parsed.lengthCm,
            }
          : {}),
        ...(parsed.productName ? { productName: parsed.productName } : {}),
      });
      if (parsed.dimsText) setDimsInput(parsed.dimsText);
      return true;
    },
    [patch]
  );

  const trackingPastePreview = useMemo(
    () => parseWarehouseReceivePaste(draft.trackingNumber),
    [draft.trackingNumber]
  );

  const continueFromTracking = () => {
    const raw = String(draft.trackingNumber || "").trim();
    if (!raw) {
      setError(t("enterTrackingNumber"));
      return;
    }
    const parsed = parseWarehouseReceivePaste(raw);
    if (parsed?.trackingNumber) {
      applyReceivePaste(parsed);
    } else {
      const compact = raw.replace(/\s+/g, "");
      const first = raw.split(/\s+/).find(Boolean) || "";
      const tracking = isTrackingToken(compact)
        ? compact
        : isTrackingToken(first)
          ? first
          : "";
      if (!tracking) {
        setError(t("enterTrackingNumber"));
        return;
      }
      patch({ trackingNumber: tracking });
    }
    setError("");
    if (warehouse === "china") {
      setView("assign");
      return;
    }
    setView("submit");
  };

  const assignFormComplete = useMemo(() => {
    if (view !== "assign" || busy || markLoading || error) return false;
    if (!isUsableMarkId(draft.markId)) return false;
    if (!String(draft.fullName || markName || "").trim()) return false;
    if (action === "received") {
      if (!String(draft.containerNumber || "").trim()) return false;
      const cbmNum = Number(cbm);
      if (!Number.isFinite(cbmNum) || cbmNum <= 0) return false;
      const kgNum = Number(
        String(draft.weightKg || "").trim().replace(",", ".")
      );
      if (!Number.isFinite(kgNum) || kgNum <= 0) return false;
      if (!String(draft.productName || "").trim()) return false;
      return true;
    }
    return Boolean(String(draft.reason || "").trim());
  }, [
    view,
    busy,
    markLoading,
    error,
    draft.markId,
    draft.fullName,
    markName,
    draft.containerNumber,
    draft.weightKg,
    draft.productName,
    draft.reason,
    action,
    cbm,
  ]);

  const submitScan = useCallback(async (reasonOverride) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if (warehouse === "china") {
        if (!isUsableMarkId(draft.markId)) {
          setError(t("enterMarkId"));
          setBusy(false);
          return;
        }
        if (!String(draft.fullName || markName || "").trim()) {
          setError(
            t("noUserForMarkShort")
          );
          setBusy(false);
          return;
        }
      }
      const cbmNum = Number(cbm);
      const kgRaw = String(draft.weightKg || "").trim().replace(",", ".");
      const kgNum = kgRaw ? Number(kgRaw) : NaN;
      const noteReason =
        reasonOverride != null
          ? String(reasonOverride).trim()
          : String(draft.reason || "").trim();
      if (warehouse === "china" && action === "received") {
        if (!String(draft.containerNumber || "").trim()) {
          setError(t("selectContainerFirst"));
          setBusy(false);
          return;
        }
        const selected = containers.find(
          (c) =>
            String(c.container_number || "").toUpperCase() ===
            String(draft.containerNumber || "")
              .trim()
              .toUpperCase()
        );
        const total = Number(selected?.total_cbm);
        const max = Number(selected?.max_cbm) || 78;
        const remaining = Number(selected?.remaining_cbm);
        const isFull =
          Boolean(selected?.is_full) ||
          (Number.isFinite(total) && total >= max);
        if (isFull) {
          setError(
            t("containerFullBody", {
              number: draft.containerNumber,
              total: Number.isFinite(total) ? total.toFixed(3) : "0",
              max,
            })
          );
          patch({ containerNumber: "" });
          setBusy(false);
          return;
        }
        if (!Number.isFinite(cbmNum) || cbmNum <= 0) {
          setError(t("enterDimensions"));
          setBusy(false);
          return;
        }
        if (Number.isFinite(remaining) && cbmNum > remaining) {
          setError(
            t("containerWouldExceedBody", {
              number: draft.containerNumber,
              remaining: remaining.toFixed(3),
              max,
            })
          );
          setBusy(false);
          return;
        }
        if (!Number.isFinite(kgNum) || kgNum <= 0) {
          setError(t("enterWeight"));
          setBusy(false);
          return;
        }
        if (!String(draft.productName || "").trim()) {
          setError(t("enterProductName"));
          setBusy(false);
          return;
        }
      }
      if (
        warehouse === "china" &&
        (action === "rejected" || action === "returned") &&
        !noteReason
      ) {
        setError(t("enterReason"));
        setBusy(false);
        return;
      }
      const sizeText =
        warehouse === "china" && action === "received"
          ? formatDimensionTriplet(
              draft.heightCm,
              draft.widthCm,
              draft.lengthCm
            )
          : "";
      const payload = {
        warehouse,
        action,
        tracking_number: String(draft.trackingNumber || "").trim(),
        mark_id: String(draft.markId || "").trim() || undefined,
        full_name: String(draft.fullName || "").trim() || undefined,
        container_number:
          String(draft.containerNumber || "").trim() || undefined,
        cbm: Number.isFinite(cbmNum) && cbmNum > 0 ? cbmNum : undefined,
        kg: Number.isFinite(kgNum) && kgNum > 0 ? kgNum : undefined,
        height_cm:
          warehouse === "china" && action === "received" && draft.heightCm
            ? draft.heightCm
            : undefined,
        width_cm:
          warehouse === "china" && action === "received" && draft.widthCm
            ? draft.widthCm
            : undefined,
        length_cm:
          warehouse === "china" && action === "received" && draft.lengthCm
            ? draft.lengthCm
            : undefined,
        size: sizeText || undefined,
        product_name: String(draft.productName || "").trim() || undefined,
        note: noteReason || undefined,
      };
      const res = await Api.scanner.submit(payload);
      const data = res.data || {};
      setLastResult({
        warehouse,
        action,
        trackingNumber: data.tracking_number || payload.tracking_number,
        markId: data.mark_id || payload.mark_id || "",
        fullName: data.full_name || payload.full_name || "",
        containerNumber: data.container_number || payload.container_number || "",
        previousContainerNumber: data.previous_container_number || "",
        reassigned: Boolean(data.reassigned),
        cbm: payload.cbm != null ? String(payload.cbm) : "",
        weightKg:
          data.kg != null
            ? String(data.kg)
            : payload.kg != null
              ? String(payload.kg)
              : "",
        productName: data.product_name || payload.product_name || "",
        statusDisplay: data.status_display || "",
        isRepack: Boolean(data.is_repack),
        repackMemberCount: Number(data.repack_member_count || 0),
        message: data.message || "",
      });
      setView("success");
    } catch (e) {
      const data = e?.response?.data || {};
      if (data?.code === "container_full" || data?.is_full) {
        patch({ containerNumber: "" });
      }
      setError(
        apiErrorMessage(
          data,
          e?.message || t("couldNotSave")
        )
      );
    } finally {
      setBusy(false);
    }
  }, [busy, cbm, draft, warehouse, action, containers, patch, markName, t]);

  // Ghana submit: lookup tracking for confirmation
  useEffect(() => {
    if (view !== "submit" || warehouse !== "ghana" || action !== "picked_up") {
      return;
    }
    const tracking = String(draft.trackingNumber || "").trim();
    if (!tracking) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await Api.scanner.trackingLookup(tracking);
        if (cancelled) return;
        patch({
          markId: res.data?.mark_id || "",
          fullName: res.data?.full_name || "",
        });
        setError("");
      } catch (e) {
        if (cancelled) return;
        patch({ markId: "", fullName: "" });
        setError(
          apiErrorMessage(
            e?.response?.data,
            e?.response?.status === 404
              ? t("trackingNotFound")
              : t("couldNotLookupTracking")
          )
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [view, warehouse, action, draft.trackingNumber, patch]);

  const scanNext = useCallback(() => {
    const keepAssign = warehouse === "china";
    setDraft((prev) =>
      keepAssign
        ? {
            ...emptyDraft(),
            // Keep container only; mark ID is per package and must start blank.
            containerNumber: prev.containerNumber || "",
          }
        : emptyDraft()
    );
    setDimsInput("");
    setLastResult(null);
    setError("");
    setInfo("");
    setView("tracking");
  }, [warehouse]);

  // After success, briefly show confirmation then return to tracking.
  useEffect(() => {
    if (view !== "success" || !lastResult?.trackingNumber) return undefined;
    const timer = setTimeout(() => {
      scanNext();
    }, 1200);
    return () => clearTimeout(timer);
  }, [view, lastResult?.trackingNumber, scanNext]);

  const openExport = async () => {
    setView("export");
    setError("");
    setInfo("");
    try {
      const list = await Api.containers.exportList();
      setExportContainers(list);
    } catch {
      setExportContainers([]);
    }
  };

  const doExport = async () => {
    if (!exportContainer) {
      setError(t("selectAContainer"));
      return;
    }
    setBusy(true);
    setError("");
    try {
      await Api.scanner.downloadContainerExport(exportContainer);
      setInfo(t("excelDownloaded"));
    } catch (e) {
      setError(apiErrorMessage(e?.response?.data, t("exportFailed")));
    } finally {
      setBusy(false);
    }
  };

  const openUpload = async () => {
    setView("upload");
    setUploadFile(null);
    setError("");
    setInfo("");
    setContainersLoading(true);
    try {
      const list = await Api.containers.excelUploadList();
      setContainers(list);
    } catch {
      setContainers([]);
    } finally {
      setContainersLoading(false);
    }
  };

  const doUpload = async () => {
    if (!draft.containerNumber) {
      setError(t("selectAContainer"));
      return;
    }
    if (!uploadFile) {
      setError(t("chooseExcel"));
      return;
    }
    setBusy(true);
    setError("");
    try {
      await Api.scanner.uploadChinaExcel({
        containerNumber: draft.containerNumber,
        file: uploadFile,
      });
      setInfo(t("excelUploaded"));
      setUploadFile(null);
    } catch (e) {
      setError(apiErrorMessage(e?.response?.data, t("uploadFailed")));
    } finally {
      setBusy(false);
    }
  };

  const openParking = async () => {
    setView("parking");
    setParkingContainer("");
    setUploadFile(null);
    setError("");
    setInfo("");
    setParkingLoading(true);
    try {
      const list = await Api.containers.parkingList();
      setParkingContainers(Array.isArray(list) ? list : []);
    } catch {
      setParkingContainers([]);
      setError(t("parkingLoadFailed"));
    } finally {
      setParkingLoading(false);
    }
  };

  const doParkingUpload = async () => {
    if (!parkingContainer) {
      setError(t("selectAContainer"));
      return;
    }
    if (!uploadFile) {
      setError(t("chooseExcel"));
      return;
    }
    setBusy(true);
    setError("");
    try {
      await Api.scanner.uploadChinaExcel({
        containerNumber: parkingContainer,
        file: uploadFile,
        source: "parking",
      });
      setInfo(t("excelUploaded"));
      setUploadFile(null);
    } catch (e) {
      setError(apiErrorMessage(e?.response?.data, t("uploadFailed")));
    } finally {
      setBusy(false);
    }
  };

  const openPickupLog = async () => {
    setView("pickup-log");
    setError("");
  };

  const openPickupByMark = () => {
    setView("pickup-by-mark");
    setError("");
    setInfo("");
    setInvoicePickup(null);
    setInvoicePickupSelected(new Set());
    setInvoicePickupContainer("");
    patch({ markId: DEFAULT_MARK_PREFIX });
  };

  const invoicePickupContainerKey = (row) => {
    const n = String(row?.container_number || "").trim();
    return n || "__none__";
  };

  const invoicePickupContainerOptions = useMemo(() => {
    const seen = new Set();
    const options = [];
    for (const row of invoicePickup?.trackings || []) {
      const key = invoicePickupContainerKey(row);
      if (seen.has(key)) continue;
      seen.add(key);
      options.push({
        value: key,
        label: key === "__none__" ? t("noContainer") : key,
      });
    }
    options.sort((a, b) => {
      if (a.value === "__none__") return 1;
      if (b.value === "__none__") return -1;
      return a.label.localeCompare(b.label);
    });
    return options;
  }, [invoicePickup, t]);

  const invoicePickupVisibleTrackings = useMemo(() => {
    const rows = invoicePickup?.trackings || [];
    if (!invoicePickupContainer) return [];
    return rows.filter(
      (row) => invoicePickupContainerKey(row) === invoicePickupContainer
    );
  }, [invoicePickup, invoicePickupContainer]);

  const applyInvoicePickupContainer = (key, trackings) => {
    setInvoicePickupContainer(key);
    if (!key) {
      setInvoicePickupSelected(new Set());
      return;
    }
    const pending = (trackings || []).filter(
      (row) =>
        invoicePickupContainerKey(row) === key &&
        !row.picked_up &&
        row.status !== "missing"
    );
    setInvoicePickupSelected(
      new Set(pending.map((row) => row.tracking_number))
    );
  };

  const loadInvoicePickup = async () => {
    const mark = withMarkPrefix(draft.markId);
    if (!isUsableMarkId(mark)) {
      setError(t("enterMarkId"));
      return;
    }
    setBusy(true);
    setError("");
    setInfo("");
    try {
      const { data } = await Api.scanner.ghanaInvoicePickupLookup(mark);
      setInvoicePickup(data);
      const rows = data?.trackings || [];
      if (!rows.length) {
        setInvoicePickupContainer("");
        setInvoicePickupSelected(new Set());
        const unpaid = Number(data?.unpaid_invoice_count || 0);
        setError(
          unpaid > 0
            ? t("unpaidInvoices", { count: unpaid })
            : t("noInvoicePackages")
        );
        return;
      }
      const seen = new Set();
      const options = [];
      for (const row of rows) {
        const key = invoicePickupContainerKey(row);
        if (seen.has(key)) continue;
        seen.add(key);
        options.push(key);
      }
      applyInvoicePickupContainer(options[0] || "", rows);
    } catch (e) {
      setInvoicePickup(null);
      setInvoicePickupSelected(new Set());
      setInvoicePickupContainer("");
      setError(
        apiErrorMessage(e?.response?.data, t("couldNotLoadInvoices"))
      );
    } finally {
      setBusy(false);
    }
  };

  const toggleInvoicePickupTn = (tn) => {
    setInvoicePickupSelected((prev) => {
      const next = new Set(prev);
      if (next.has(tn)) next.delete(tn);
      else next.add(tn);
      return next;
    });
  };

  const confirmInvoicePickup = async () => {
    if (!invoicePickup?.mark_id || invoicePickupSelected.size === 0) return;
    if (!invoicePickupContainer) {
      setError(t("pickupContainerRequired"));
      return;
    }
    setBusy(true);
    setError("");
    setInfo("");
    try {
      const { data } = await Api.scanner.ghanaInvoicePickupSubmit({
        mark_id: invoicePickup.mark_id,
        tracking_numbers: Array.from(invoicePickupSelected),
      });
      setInfo(
        data?.message ||
          `Picked up ${data?.picked_count || 0} package(s) for ${
            invoicePickup.mark_id
          }`
      );
      if (Number(data?.error_count || 0) > 0) {
        setError(t("pickupPartialFail"));
      }
      const prevContainer = invoicePickupContainer;
      const refreshed = await Api.scanner.ghanaInvoicePickupLookup(
        invoicePickup.mark_id
      );
      setInvoicePickup(refreshed.data);
      const rows = refreshed.data?.trackings || [];
      const keys = [
        ...new Set(rows.map((row) => invoicePickupContainerKey(row))),
      ];
      const nextKey = keys.includes(prevContainer)
        ? prevContainer
        : keys[0] || "";
      applyInvoicePickupContainer(nextKey, rows);
    } catch (e) {
      setError(apiErrorMessage(e?.response?.data, t("pickupFailed")));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (view !== "pickup-log") return;
    let cancelled = false;
    (async () => {
      setBusy(true);
      try {
        const [logRes, byMarkRes] = await Promise.all([
          Api.scanner.ghanaPickups({ date: pickupDate }),
          Api.scanner.ghanaPickupsByMark({ date: pickupDate }),
        ]);
        if (cancelled) return;
        setPickupLog(logRes.data || null);
        setPickupByMark(byMarkRes.data || null);
      } catch (e) {
        if (!cancelled) {
          setPickupLog(null);
          setPickupByMark(null);
          setError(apiErrorMessage(e?.response?.data, t("pickupLogFailed")));
        }
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [view, pickupDate]);

  return (
    <div className="warehouse-app min-h-screen" data-theme={theme} lang={language}>
      <header className="sticky top-0 z-20 border-b border-white/[0.08] bg-[#0B1220]/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[96rem] items-center gap-6 px-6 lg:px-10">
          <button
            type="button"
            onClick={goHome}
            className="flex shrink-0 items-baseline gap-2.5"
          >
            <span className="text-[13px] font-semibold tracking-[0.18em] text-amber-400">
              FIMW
            </span>
            <span className="text-[15px] font-semibold text-white">
              {t("brandWarehouse")}
            </span>
          </button>

          <div className="h-5 w-px shrink-0 bg-white/10" />

          <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
            <button
              type="button"
              onClick={() => openWarehouse("china")}
              className={`rounded-md px-3 py-1.5 text-[13px] font-medium transition ${
                warehouse === "china"
                  ? "text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {t("china")}
            </button>
            <button
              type="button"
              onClick={() => openWarehouse("ghana")}
              className={`rounded-md px-3 py-1.5 text-[13px] font-medium transition ${
                warehouse === "ghana" ? "text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              {t("ghana")}
            </button>

            <div className="mx-2 hidden h-4 w-px bg-white/10 sm:block" />

            <div className="flex items-center rounded-lg bg-white/[0.04] p-0.5 ring-1 ring-inset ring-white/10">
              {CHINA_ACTIONS.map((item) => {
                const active =
                  warehouse === "china" &&
                  action === item.id &&
                  ["tracking", "assign", "submit", "success"].includes(view);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => startChinaNavAction(item.id)}
                    className={`rounded-md px-3 py-1.5 text-[13px] font-medium transition ${
                      active
                        ? "bg-white/10 text-white shadow-sm"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {t(item.labelKey)}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={openReceivedPackages}
              className={`rounded-md px-3 py-1.5 text-[13px] font-medium transition ${
                view === "received-packages"
                  ? "text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {t("packages")}
            </button>
          </nav>

          <div className="flex shrink-0 items-center gap-3">
            <div
              className="flex items-center rounded-lg bg-white/[0.04] p-0.5 ring-1 ring-inset ring-white/10"
              role="group"
              aria-label={t("language")}
            >
              {WAREHOUSE_LANGUAGES.map((lang) => (
                <button
                  key={lang.id}
                  type="button"
                  onClick={() => setLanguage(lang.id)}
                  className={`rounded-md px-3 py-1.5 text-[13px] font-medium transition ${
                    language === lang.id
                      ? "bg-white/10 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
            <div
              className="flex items-center rounded-lg bg-white/[0.04] p-0.5 ring-1 ring-inset ring-white/10"
              role="group"
              aria-label="Theme"
            >
              <button
                type="button"
                onClick={() => applyTheme("dark")}
                className={`rounded-md px-3 py-1.5 text-[13px] font-medium transition ${
                  theme === "dark"
                    ? "bg-white/10 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {t("dark")}
              </button>
              <button
                type="button"
                onClick={() => applyTheme("light")}
                className={`rounded-md px-3 py-1.5 text-[13px] font-medium transition ${
                  theme === "light"
                    ? "bg-white/10 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {t("light")}
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem("token");
                localStorage.removeItem("refreshToken");
                localStorage.removeItem("adminToken");
                window.location.href = "/admin-login?returnTo=/warehouse";
              }}
              className="text-[13px] font-medium text-slate-400 transition hover:text-white"
            >
              {t("signOut")}
            </button>
          </div>
        </div>
      </header>

      {view === "home" ? (
        <Shell
          title={t("whereScanning")}
          subtitle={t("whereScanningSub")}
        >
          <ActionGrid>
            <ActionCard
              title={t("chinaWarehouse")}
              hint={t("chinaWarehouseDesc")}
              tone="amber"
              onClick={() => openWarehouse("china")}
            />
            <ActionCard
              title={t("ghanaWarehouse")}
              hint={t("ghanaWarehouseDesc")}
              tone="teal"
              onClick={() => openWarehouse("ghana")}
            />
          </ActionGrid>
        </Shell>
      ) : null}

      {view === "china-home" ? (
        <Shell
          eyebrow={t("chinaWarehouse")}
          title={t("chooseAction")}
          subtitle={t("chooseActionSub")}
          onBack={goHome}
        >
          <ActionGrid>
            {CHINA_ACTIONS.map((item) => (
              <ActionCard
                key={item.id}
                title={t(item.labelKey)}
                hint={t(item.hintKey)}
                tone={item.tone}
                onClick={() => startAction(item.id)}
              />
            ))}
            <ActionCard
              title={t("receivedPackages")}
              hint={t("receivedPackagesHintChina")}
              tone="success"
              onClick={openReceivedPackages}
            />
            <ActionCard
              title={t("exportContainer")}
              hint={t("exportContainerHint")}
              tone="amber"
              onClick={openExport}
            />
            <ActionCard
              title={t("uploadExcel")}
              hint={t("uploadExcelHint")}
              tone="amber"
              onClick={openUpload}
            />
            <ActionCard
              title={t("parkingList")}
              hint={t("parkingListHint")}
              tone="amber"
              onClick={openParking}
            />
          </ActionGrid>
        </Shell>
      ) : null}

      {view === "ghana-home" ? (
        <Shell
          eyebrow={t("ghanaWarehouse")}
          title={t("pickup")}
          subtitle={t("pickupSub")}
          onBack={goHome}
        >
          <ActionGrid>
            <ActionCard
              title={t("pickedUp")}
              hint={t("pickedUpHint")}
              tone="teal"
              onClick={() => startAction("picked_up")}
            />
            <ActionCard
              title={t("pickupByMark")}
              hint={t("pickupByMarkHint")}
              tone="teal"
              onClick={openPickupByMark}
            />
            <ActionCard
              title={t("pickupLog")}
              hint={t("pickupLogHint")}
              tone="teal"
              onClick={openPickupLog}
            />
          </ActionGrid>
        </Shell>
      ) : null}

      {view === "tracking" ? (
        <Shell
          eyebrow={`${warehouse === "china" ? t("chinaDot") : t("ghanaDot")} · ${actionLabel(
            warehouse,
            action,
            t
          )}`}
          title={t("enterTracking")}
          subtitle={t("enterTrackingSub")}
          onBack={() =>
            setView(warehouse === "china" ? "china-home" : "ghana-home")
          }
        >
          <Panel className="mx-auto max-w-2xl">
            {error ? (
              <div className="mb-4 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-300">
                {error}
              </div>
            ) : null}
            <Field label={t("trackingNumber")}>
              <textarea
                className={`${inputClass} min-h-[7.5rem] resize-y leading-relaxed`}
                value={draft.trackingNumber}
                autoFocus
                autoComplete="off"
                spellCheck={false}
                rows={4}
                placeholder={t("trackingPlaceholder")}
                onChange={(e) => {
                  patch({ trackingNumber: e.target.value });
                  setError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    continueFromTracking();
                  }
                }}
              />
            </Field>
            {trackingPastePreview?.trackingNumber ? (
              <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  {t("pastePreview")}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {t("pastePreviewHint")}
                </p>
                <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                  <Row
                    label={t("tracking")}
                    value={trackingPastePreview.trackingNumber}
                  />
                  {trackingPastePreview.markId ? (
                    <Row label={t("markId")} value={trackingPastePreview.markId} />
                  ) : null}
                  {trackingPastePreview.weightKg ? (
                    <Row
                      label={t("weightKg")}
                      value={trackingPastePreview.weightKg}
                    />
                  ) : null}
                  {trackingPastePreview.dimsText ? (
                    <Row
                      label={t("packageDimensions")}
                      value={trackingPastePreview.dimsText}
                    />
                  ) : null}
                  {trackingPastePreview.productName ? (
                    <Row
                      label={t("product")}
                      value={trackingPastePreview.productName}
                    />
                  ) : null}
                </div>
              </div>
            ) : null}
            <div className="mt-5 flex justify-end">
              <PrimaryButton onClick={continueFromTracking} className="min-w-[160px]">
                {t("continue")}
              </PrimaryButton>
            </div>
          </Panel>
        </Shell>
      ) : null}

      {view === "assign" ? (
        <Shell
          eyebrow={`${t("chinaDot")} · ${actionLabel(warehouse, action, t)} · ${draft.trackingNumber}`}
          title={action === "received" ? t("containerAndMark") : t("markId")}
          subtitle={
            action === "received" ? t("assignReceivedSub") : t("assignRejectSub")
          }
          onBack={() => setView("tracking")}
        >
          {error ? (
            <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-300">
              {error}
            </div>
          ) : null}

          <div
            className={`grid grid-cols-1 gap-5 ${
              action === "received" ? "lg:grid-cols-2" : "lg:grid-cols-1 lg:max-w-2xl"
            }`}
          >
            <Panel className="space-y-4">
              {action === "received" ? (
                <Field label={t("containerLabel")}>
                  <select
                    className={inputClass}
                    value={draft.containerNumber}
                    disabled={containersLoading}
                    onChange={(e) => {
                      const value = e.target.value;
                      const row = containers.find(
                        (c) =>
                          String(c.container_number || "") === String(value)
                      );
                      const total = Number(row?.total_cbm);
                      const max = Number(row?.max_cbm) || 78;
                      const remaining = Number(row?.remaining_cbm);
                      const isFull =
                        Boolean(row?.is_full) ||
                        (Number.isFinite(total) && total >= max);
                      if (value && isFull) {
                        setError(
                          t("containerFullBody", {
                            number: value,
                            total: Number.isFinite(total) ? total.toFixed(3) : "0",
                            max,
                          })
                        );
                        patch({ containerNumber: "" });
                        return;
                      }
                      const packageCbm = Number(cbm);
                      if (
                        value &&
                        Number.isFinite(packageCbm) &&
                        packageCbm > 0 &&
                        Number.isFinite(remaining) &&
                        packageCbm > remaining
                      ) {
                        setError(
                          t("containerWouldExceedBody", {
                            number: value,
                            remaining: remaining.toFixed(3),
                            max,
                          })
                        );
                        patch({ containerNumber: "" });
                        return;
                      }
                      patch({ containerNumber: value });
                      setError("");
                    }}
                  >
                    <option value="">
                      {containersLoading ? t("loading") : t("selectContainer")}
                    </option>
                    {containers.map((c) => {
                      const total = Number(c.total_cbm);
                      const max = Number(c.max_cbm) || 78;
                      const isFull =
                        Boolean(c.is_full) ||
                        (Number.isFinite(total) && total >= max);
                      const status = c.status_display || c.status
                        ? ` · ${String(c.status_display || c.status).replaceAll("_", " ")}`
                        : "";
                      const cbmLabel = Number.isFinite(total)
                        ? ` · ${total.toFixed(3)}/${max} CBM`
                        : "";
                      return (
                        <option
                          key={c.id || c.container_number}
                          value={c.container_number}
                          disabled={isFull}
                        >
                          {c.container_number}
                          {status}
                          {cbmLabel}
                          {isFull ? ` · ${t("fullUseNext")}` : ""}
                        </option>
                      );
                    })}
                  </select>
                  <p className="text-xs text-slate-500">
                    {t("containersAvailable", {
                      count: containers.length,
                      plural: containers.length === 1 ? "" : "s",
                    })}
                  </p>
                </Field>
              ) : null}

              <Field
                label={t("markId")}
                hint={t("markFimHint")}
              >
                <div className="mb-2 flex gap-2">
                  {MARK_PREFIXES.map((prefix) => {
                    const active = markPrefixOf(draft.markId) === prefix;
                    return (
                      <button
                        key={prefix}
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          const digits = String(draft.markId || "")
                            .toUpperCase()
                            .replace(/^(FIM|BSC)/, "")
                            .replace(/\D/g, "");
                          patch({
                            markId: withMarkPrefix(prefix + digits),
                          });
                          setError("");
                        }}
                        className={`rounded-lg border px-3 py-1.5 text-sm font-bold transition ${
                          active
                            ? "border-amber-400/60 bg-amber-500/15 text-amber-200"
                            : "border-white/10 bg-[#151D2E] text-slate-400 hover:border-white/20"
                        }`}
                      >
                        {prefix}
                      </button>
                    );
                  })}
                </div>
                <input
                  className={inputClass}
                  value={draft.markId}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder={t("markPlaceholder")}
                  disabled={busy}
                  onChange={(e) => {
                    patch({ markId: withMarkPrefix(e.target.value) });
                    setError("");
                  }}
                />
                <p className="mt-1 text-sm font-semibold text-amber-300">
                  {t("noShippingMarkHint")}
                </p>
                {markLoading ? (
                  <p className="text-xs text-slate-400">{t("lookingUpName")}</p>
                ) : markName ? (
                  <p className="text-sm font-semibold text-emerald-300">
                    {markName}
                  </p>
                ) : isUsableMarkId(draft.markId) ? (
                  <p className="text-sm font-semibold text-rose-300">
                    {t("noUserForMark")}
                  </p>
                ) : null}
              </Field>

              {action !== "received" ? (
                <Field
                  label={t("reason")}
                  hint={t("rejectReturnReasonHint")}
                >
                  <div className="grid gap-2 sm:grid-cols-2">
                    {REJECT_RETURN_REASONS.map((item) => {
                      const selected = draft.reason === item.value;
                      return (
                        <button
                          key={item.value}
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            if (!isUsableMarkId(draft.markId) || !markName) {
                              setError(t("noUserForMarkShort"));
                              return;
                            }
                            patch({ reason: item.value });
                            setError("");
                          }}
                          className={`rounded-xl border px-3 py-3 text-left text-sm font-semibold transition ${
                            selected
                              ? "border-amber-400/60 bg-amber-500/15 text-amber-200"
                              : "border-white/10 bg-[#151D2E] text-slate-200 hover:border-white/20"
                          }`}
                        >
                          {t(item.labelKey)}
                        </button>
                      );
                    })}
                  </div>
                </Field>
              ) : null}
            </Panel>

            {action === "received" ? (
              <Panel className="space-y-4">
                <Field label={t("weightKg")}>
                  <input
                    className={inputClass}
                    inputMode="decimal"
                    value={draft.weightKg}
                    placeholder={t("weightKgPlaceholder")}
                    disabled={busy}
                    onChange={(e) => {
                      patch({
                        weightKg: String(e.target.value || "").replace(
                          /[^0-9.,]/g,
                          ""
                        ),
                      });
                      setError("");
                    }}
                  />
                </Field>
                <Field
                  label={t("packageDimensions")}
                  hint={t("cbmFormulaHint")}
                >
                  <input
                    className={inputClass}
                    inputMode="decimal"
                    placeholder={t("dimsInputPlaceholder")}
                    value={dimsInput}
                    disabled={busy}
                    onChange={(e) => applyDimsInput(e.target.value)}
                  />
                  {dimsInput.trim() && !cbm ? (
                    <span className="mt-1 block text-xs text-rose-300">
                      {t("dimsInputInvalid")}
                    </span>
                  ) : null}
                </Field>
                <div className="rounded-xl border border-white/10 bg-[#151D2E] px-4 py-4">
                  <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                    {t("cbmAuto")}
                  </div>
                  <div className="mt-1 text-3xl font-black text-amber-300">
                    {cbm || "—"}
                  </div>
                </div>
                <Field
                  label={t("productName")}
                  hint={t("productNameHint")}
                >
                  <input
                    className={inputClass}
                    value={draft.productName}
                    placeholder={t("productNamePlaceholder")}
                    disabled={busy}
                    onChange={(e) => {
                      patch({ productName: e.target.value });
                      setError("");
                    }}
                  />
                </Field>
              </Panel>
            ) : null}
          </div>

          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
            {busy ? (
              <div className="flex items-center justify-end gap-3 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-300">
                {t("saving")}
              </div>
            ) : null}
            <PrimaryButton
              disabled={busy || !assignFormComplete}
              onClick={() => submitScan()}
              className="min-w-[160px]"
            >
              {busy ? t("saving") : t("save")}
            </PrimaryButton>
          </div>
        </Shell>
      ) : null}

      {view === "submit" ? (
        <Shell
          eyebrow={`${warehouse === "china" ? t("chinaDot") : t("ghanaDot")} · ${t("review")}`}
          title={t("submitScan")}
          subtitle={t("submitScanSub")}
          onBack={() =>
            setView(warehouse === "china" ? "assign" : "tracking")
          }
        >
          <div className="mx-auto grid max-w-3xl gap-5">
            {error ? (
              <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-300">
                {error}
              </div>
            ) : null}
            <Panel>
              <div className="grid grid-cols-1 gap-x-8 gap-y-1 sm:grid-cols-2">
                <Row label={t("action")} value={actionLabel(warehouse, action, t)} />
                <Row label={t("tracking")} value={draft.trackingNumber} />
                {draft.markId ? (
                  <Row label={t("markId")} value={draft.markId} />
                ) : null}
                {draft.fullName ? (
                  <Row label={t("customer")} value={draft.fullName} accent />
                ) : null}
                {draft.containerNumber ? (
                  <Row label={t("container")} value={draft.containerNumber} />
                ) : null}
                {cbm ? <Row label={t("cbm")} value={cbm} /> : null}
                {draft.weightKg ? (
                  <Row label={t("weightKg")} value={draft.weightKg} />
                ) : null}
                {draft.productName ? (
                  <Row label={t("product")} value={draft.productName} />
                ) : null}
                {draft.reason ? (
                  <Row label={t("reason")} value={draft.reason} />
                ) : null}
              </div>
            </Panel>
            <div className="flex justify-end">
              <PrimaryButton
                disabled={busy}
                onClick={submitScan}
                className="min-w-[160px]"
              >
                {busy ? t("saving") : t("submit")}
              </PrimaryButton>
            </div>
          </div>
        </Shell>
      ) : null}

      {view === "success" && lastResult ? (
        <Shell eyebrow={t("saved")} title={t("scanRecorded")}>
          <div className="mx-auto grid max-w-3xl gap-5">
            <Panel>
              <div className="grid grid-cols-1 gap-x-8 gap-y-1 sm:grid-cols-2">
                <Row
                  label={t("action")}
                  value={actionLabel(lastResult.warehouse, lastResult.action, t)}
                  accent
                />
                <Row label={t("tracking")} value={lastResult.trackingNumber} />
                {lastResult.markId ? (
                  <Row label={t("markId")} value={lastResult.markId} />
                ) : null}
                {lastResult.fullName ? (
                  <Row label={t("customer")} value={lastResult.fullName} accent />
                ) : null}
                {lastResult.containerNumber ? (
                  <Row label={t("container")} value={lastResult.containerNumber} />
                ) : null}
                {lastResult.reassigned && lastResult.previousContainerNumber ? (
                  <Row
                    label={t("movedFrom")}
                    value={lastResult.previousContainerNumber}
                    accent
                  />
                ) : null}
                {lastResult.cbm ? (
                  <Row label={t("cbm")} value={lastResult.cbm} />
                ) : null}
                {lastResult.weightKg ? (
                  <Row label={t("weightKg")} value={lastResult.weightKg} />
                ) : null}
                {lastResult.productName ? (
                  <Row label={t("product")} value={lastResult.productName} />
                ) : null}
                {lastResult.statusDisplay ? (
                  <Row label={t("status")} value={lastResult.statusDisplay} accent />
                ) : null}
              </div>
            </Panel>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold text-emerald-300">
                {t("returningToTracking")}
              </p>
              <SecondaryButton
                onClick={() =>
                  setView(warehouse === "china" ? "china-home" : "ghana-home")
                }
              >
                {t("doneBack")}
              </SecondaryButton>
            </div>
          </div>
        </Shell>
      ) : null}

      {view === "received-packages" ? (
        <WarehouseReceivedPackages
          onBack={() => {
            setView("china-home");
            setWarehouse("china");
          }}
        />
      ) : null}

      {view === "export" ? (
        <Shell
          eyebrow={t("chinaWarehouse")}
          title={t("exportContainer")}
          subtitle={t("exportContainerSub")}
          onBack={() => setView("china-home")}
        >
          <Panel className="mx-auto max-w-2xl space-y-4">
            {error ? (
              <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-300">
                {error}
              </div>
            ) : null}
            {info ? (
              <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-300">
                {info}
              </div>
            ) : null}
            <Field label={t("container")}>
              <select
                className={inputClass}
                value={exportContainer}
                onChange={(e) => setExportContainer(e.target.value)}
              >
                <option value="">{t("selectContainer")}</option>
                {exportContainers.map((c) => (
                  <option
                    key={c.id || c.container_number}
                    value={c.container_number}
                  >
                    {c.container_number}
                    {c.status_display || c.status
                      ? ` · ${String(c.status_display || c.status).replaceAll("_", " ")}`
                      : ""}
                  </option>
                ))}
              </select>
            </Field>
            <div className="flex justify-end">
              <PrimaryButton
                disabled={busy}
                onClick={doExport}
                className="min-w-[180px]"
              >
                {busy ? t("exporting") : t("exportExcel")}
              </PrimaryButton>
            </div>
          </Panel>
        </Shell>
      ) : null}

      {view === "upload" ? (
        <Shell
          eyebrow={t("chinaWarehouse")}
          title={t("uploadExcel")}
          subtitle={t("uploadExcelSub")}
          onBack={() => setView("china-home")}
        >
          <Panel className="mx-auto max-w-2xl space-y-4">
            {error ? (
              <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-300">
                {error}
              </div>
            ) : null}
            {info ? (
              <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-300">
                {info}
              </div>
            ) : null}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label={t("containerLabelUpload")}>
                <select
                  className={inputClass}
                  value={draft.containerNumber}
                  disabled={containersLoading}
                  onChange={(e) => patch({ containerNumber: e.target.value })}
                >
                  <option value="">
                    {containersLoading ? t("loading") : t("selectContainer")}
                  </option>
                  {containers.map((c) => (
                    <option
                      key={c.id || c.container_number}
                      value={c.container_number}
                    >
                      {c.container_number}
                      {c.status_display || c.status
                        ? ` · ${String(c.status_display || c.status).replaceAll("_", " ")}`
                        : ""}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t("excelFile")}>
                <input
                  type="file"
                  accept=".xlsx,.xls,.xlsm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  className="block w-full text-sm text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-amber-400 file:px-3 file:py-2 file:text-sm file:font-bold file:text-[#0B1220]"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                />
                {uploadFile ? (
                  <p className="text-xs text-slate-400">{uploadFile.name}</p>
                ) : null}
              </Field>
            </div>
            <div className="flex justify-end">
              <PrimaryButton
                disabled={busy}
                onClick={doUpload}
                className="min-w-[200px]"
              >
                {busy ? t("uploading") : t("uploadToContainer")}
              </PrimaryButton>
            </div>
          </Panel>
        </Shell>
      ) : null}

      {view === "parking" ? (
        <Shell
          eyebrow={t("chinaWarehouse")}
          title={t("parkingList")}
          subtitle={t("parkingListSub")}
          onBack={() => setView("china-home")}
        >
          <Panel className="mx-auto max-w-2xl space-y-4">
            {error ? (
              <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-300">
                {error}
              </div>
            ) : null}
            {info ? (
              <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-300">
                {info}
              </div>
            ) : null}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label={t("parkingSelectLabel")}>
                <select
                  className={inputClass}
                  value={parkingContainer}
                  disabled={parkingLoading}
                  onChange={(e) => {
                    setParkingContainer(e.target.value);
                    setError("");
                    setInfo("");
                  }}
                >
                  <option value="">
                    {parkingLoading ? t("loading") : t("selectContainer")}
                  </option>
                  {parkingContainers.map((c) => (
                    <option
                      key={c.id || c.container_number}
                      value={c.container_number}
                    >
                      {c.container_number}
                      {c.status_display || c.status
                        ? ` · ${String(c.status_display || c.status).replaceAll("_", " ")}`
                        : ""}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t("excelFile")}>
                <input
                  type="file"
                  accept=".xlsx,.xls,.xlsm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  className="block w-full text-sm text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-amber-400 file:px-3 file:py-2 file:text-sm file:font-bold file:text-[#0B1220]"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                />
                {uploadFile ? (
                  <p className="text-xs text-slate-400">{uploadFile.name}</p>
                ) : null}
              </Field>
            </div>
            <div className="flex justify-end">
              <PrimaryButton
                disabled={busy}
                onClick={doParkingUpload}
                className="min-w-[200px]"
              >
                {busy ? t("uploading") : t("uploadToContainer")}
              </PrimaryButton>
            </div>
          </Panel>
        </Shell>
      ) : null}

      {view === "pickup-by-mark" ? (
        <Shell
          wide
          eyebrow={t("ghanaWarehouse")}
          title={t("pickupByMark")}
          subtitle={t("pickupByMarkSub")}
          onBack={() => setView("ghana-home")}
        >
          {error ? (
            <div className="mb-4 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-300">
              {error}
            </div>
          ) : null}
          {info ? (
            <div className="mb-4 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-300">
              {info}
            </div>
          ) : null}
          <Panel className="mx-auto max-w-4xl">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <Field label={t("markId")} className="flex-1">
                <div className="mb-2 flex gap-2">
                  {MARK_PREFIXES.map((prefix) => {
                    const active = markPrefixOf(draft.markId) === prefix;
                    return (
                      <button
                        key={prefix}
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          const digits = String(draft.markId || "")
                            .toUpperCase()
                            .replace(/^(FIM|BSC)/, "")
                            .replace(/\D/g, "");
                          patch({
                            markId: withMarkPrefix(prefix + digits),
                          });
                          setError("");
                        }}
                        className={`rounded-lg border px-3 py-1.5 text-sm font-bold transition ${
                          active
                            ? "border-amber-400/60 bg-amber-500/15 text-amber-200"
                            : "border-white/10 bg-[#151D2E] text-slate-400 hover:border-white/20"
                        }`}
                      >
                        {prefix}
                      </button>
                    );
                  })}
                </div>
                <input
                  className={inputClass}
                  value={draft.markId}
                  autoFocus
                  autoComplete="off"
                  spellCheck={false}
                  placeholder={t("markPlaceholder")}
                  onChange={(e) => {
                    patch({ markId: withMarkPrefix(e.target.value) });
                    setError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") loadInvoicePickup();
                  }}
                />
              </Field>
              <PrimaryButton
                disabled={busy}
                onClick={loadInvoicePickup}
                className="min-w-[160px]"
              >
                {busy ? t("loading") : t("lookupInvoices")}
              </PrimaryButton>
            </div>

            {invoicePickup ? (
              <div className="mt-5 space-y-4">
                <div className="rounded-xl border border-white/10 bg-[#151D2E] px-4 py-3">
                  <div className="text-xl font-black text-amber-300">
                    {invoicePickup.mark_id}
                  </div>
                  <div className="text-sm font-semibold text-slate-300">
                    {invoicePickup.full_name || "—"}
                  </div>
                  <div className="mt-1 text-xs font-bold text-teal-300">
                    {t("paidInvoicesPending", {
                      invoices: invoicePickup.invoice_count || 0,
                      pending: invoicePickupVisibleTrackings.filter(
                        (row) => !row.picked_up && row.status !== "missing"
                      ).length,
                    })}
                  </div>
                  {Number(invoicePickup.unpaid_invoice_count || 0) > 0 ? (
                    <div className="mt-1 text-xs font-bold text-amber-300">
                      {t("unpaidHidden", {
                        count: invoicePickup.unpaid_invoice_count,
                      })}
                    </div>
                  ) : null}
                </div>

                {invoicePickupContainerOptions.length > 0 ? (
                  <Field label={t("container")}>
                    <select
                      className={inputClass}
                      value={invoicePickupContainer}
                      onChange={(e) => {
                        setError("");
                        applyInvoicePickupContainer(
                          e.target.value,
                          invoicePickup.trackings || []
                        );
                      }}
                    >
                      <option value="">{t("selectContainer")}</option>
                      {invoicePickupContainerOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                ) : null}

                {invoicePickupContainer ? (
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <button
                        type="button"
                        className="text-sm font-bold text-teal-300 hover:text-teal-200"
                        onClick={() => {
                          const pending = invoicePickupVisibleTrackings.filter(
                            (row) =>
                              !row.picked_up && row.status !== "missing"
                          );
                          setInvoicePickupSelected(
                            new Set(pending.map((row) => row.tracking_number))
                          );
                        }}
                      >
                        {t("selectAllPending")}
                      </button>
                      <button
                        type="button"
                        className="text-sm font-bold text-slate-400 hover:text-slate-200"
                        onClick={() => setInvoicePickupSelected(new Set())}
                      >
                        {t("clear")}
                      </button>
                    </div>

                    <div className="max-h-[28rem] space-y-2 overflow-y-auto pr-1">
                      {invoicePickupVisibleTrackings.map((row) => {
                        const disabled =
                          row.picked_up || row.status === "missing";
                        const checked = invoicePickupSelected.has(
                          row.tracking_number
                        );
                        return (
                          <label
                            key={`${row.tracking_number}-${row.invoice_id || ""}`}
                            className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 ${
                              checked
                                ? "border-teal-400/50 bg-teal-500/10"
                                : "border-white/10 bg-[#151D2E]"
                            } ${disabled ? "cursor-not-allowed opacity-55" : ""}`}
                          >
                            <input
                              type="checkbox"
                              className="mt-1"
                              disabled={disabled}
                              checked={checked}
                              onChange={() =>
                                toggleInvoicePickupTn(row.tracking_number)
                              }
                            />
                            <div className="min-w-0 flex-1">
                              <div className="font-extrabold text-slate-50">
                                {row.tracking_number}
                              </div>
                              <div className="text-xs font-semibold text-slate-400">
                                {t("invoice")} {row.invoice_number || "—"}
                                {row.invoice_status
                                  ? ` · ${row.invoice_status}`
                                  : ""}
                                {row.container_number
                                  ? ` · ${row.container_number}`
                                  : ""}
                              </div>
                              <div
                                className={`mt-0.5 text-xs font-bold ${
                                  row.picked_up
                                    ? "text-emerald-300"
                                    : row.status === "missing"
                                      ? "text-rose-300"
                                      : "text-amber-300"
                                }`}
                              >
                                {row.picked_up
                                  ? t("alreadyPicked")
                                  : row.status === "missing"
                                    ? t("missingTracking")
                                    : row.status_display || row.status}
                                {row.is_repack
                                  ? ` · Repack (${row.package_count || 1})`
                                  : ""}
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>

                    <div className="flex justify-end">
                      <PrimaryButton
                        disabled={
                          busy ||
                          invoicePickupSelected.size === 0 ||
                          !invoicePickupContainer
                        }
                        onClick={confirmInvoicePickup}
                        className="min-w-[220px]"
                      >
                        {busy
                          ? t("markingPickup")
                          : t("markSelectedPickup", {
                              count: invoicePickupSelected.size,
                            })}
                      </PrimaryButton>
                    </div>
                  </>
                ) : (
                  <p className="text-sm font-semibold text-amber-300">
                    {t("selectContainerToSee")}
                  </p>
                )}
              </div>
            ) : null}
          </Panel>
        </Shell>
      ) : null}

      {view === "pickup-log" ? (
        <Shell
          wide
          eyebrow={t("ghanaWarehouse")}
          title={t("pickupLog")}
          subtitle={t("pickupLogSub")}
          onBack={() => setView("ghana-home")}
          actions={
            <Field label={t("date")} className="w-44">
              <input
                type="date"
                className={inputClass}
                value={pickupDate}
                onChange={(e) => setPickupDate(e.target.value)}
              />
            </Field>
          }
        >
          {error ? (
            <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-300">
              {error}
            </div>
          ) : null}
          {busy ? (
            <p className="text-sm text-slate-400">{t("loading")}</p>
          ) : (
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
              <Panel className="xl:col-span-1">
                {pickupLog?.summary ? (
                  <div className="mb-5">
                    <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                      {t("pickupsToday")}
                    </div>
                    <div className="mt-1 text-4xl font-black text-amber-300">
                      {String(
                        pickupLog.summary.total ??
                          pickupLog.summary.count ??
                          pickupLog.results?.length ??
                          "—"
                      )}
                    </div>
                  </div>
                ) : null}
                <h3 className="mb-3 text-sm font-bold text-slate-300">
                  {t("byMarkId")}
                </h3>
                {(pickupByMark?.results || pickupByMark?.marks || []).length ===
                0 ? (
                  <p className="text-sm text-slate-500">
                    {t("noPickupsForDay")}
                  </p>
                ) : (
                  <div className="max-h-[28rem] space-y-2 overflow-y-auto pr-1">
                    {(pickupByMark?.results || pickupByMark?.marks || []).map(
                      (row, i) => (
                        <div
                          key={row.mark_id || i}
                          className="rounded-xl border border-white/10 bg-[#151D2E] px-3 py-2.5 text-sm"
                        >
                          <div className="font-extrabold text-amber-300">
                            {row.mark_id || "—"}
                          </div>
                          <div className="text-slate-300">
                            {row.full_name || row.customer_name || "—"}
                            {" · "}
                            {row.count ?? row.total ?? row.packages ?? 0}{" "}
                            {t("pkg")}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
              </Panel>
              <Panel className="xl:col-span-2">
                <h3 className="mb-3 text-sm font-bold text-slate-300">
                  {t("activity")}
                </h3>
                {(pickupLog?.results || []).length === 0 ? (
                  <p className="text-sm text-slate-500">{t("noPickupsForDay")}</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-white/10 text-[11px] uppercase tracking-[0.1em] text-slate-500">
                          <th className="px-3 py-2 font-bold">{t("tracking")}</th>
                          <th className="px-3 py-2 font-bold">{t("markId")}</th>
                          <th className="px-3 py-2 font-bold">{t("customer")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(pickupLog?.results || []).slice(0, 100).map(
                          (row, i) => (
                            <tr
                              key={row.id || row.tracking_number || i}
                              className="border-b border-white/5"
                            >
                              <td className="px-3 py-2.5 font-mono font-bold text-slate-100">
                                {row.tracking_number || "—"}
                              </td>
                              <td className="px-3 py-2.5 text-amber-300">
                                {row.mark_id || "—"}
                              </td>
                              <td className="px-3 py-2.5 text-slate-300">
                                {row.full_name || "—"}
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </Panel>
            </div>
          )}
        </Shell>
      ) : null}
    </div>
  );
}

function Row({ label, value, accent }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-white/5 py-2.5 last:border-0">
      <span className="shrink-0 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">
        {label}
      </span>
      <span
        className={`max-w-[70%] text-right text-sm font-bold ${
          accent ? "text-emerald-300" : "text-slate-100"
        }`}
      >
        {value || "—"}
      </span>
    </div>
  );
}
