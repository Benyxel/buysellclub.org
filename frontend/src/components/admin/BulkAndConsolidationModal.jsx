import React, { useEffect, useRef, useState } from "react";
import { FaTimesCircle } from "react-icons/fa";
import API from "../../api";
import { toast } from "../../utils/toast";
import { apiErrorMessage } from "../../utils/apiErrorMessage";
import {
  normalizeMarkIdInput,
  preferExactMarkMatches,
  withMarkPrefix,
} from "../../utils/markIdFormat";
import MarkPrefixChooser from "../MarkPrefixChooser";
import {
  calcCbm,
  parseDimensionTriplet,
  sanitizeDimsInput,
} from "../../utils/packageDims";

const statusOptions = [
  { value: "pending", label: "Pending" },
  { value: "arrived", label: "Arrived(China)" },
  { value: "laden", label: "Laden" },
  { value: "in_transit", label: "In Transit" },
  { value: "arrived_port", label: "Arrived at Port" },
  { value: "clearing", label: "Clearing" },
  { value: "offloaded", label: "Offloaded" },
  { value: "pick_up", label: "Pick up" },
  { value: "rejected", label: "Rejected" },
];

/**
 * Shared modal: one Mark ID + container for bulk tracking and/or consolidation.
 * @param {"bulk"|"consolidation"|"both"} initialMode
 * @param {boolean} forAgent - agent repack API paths (bulk-create stays admin)
 */
export default function BulkAndConsolidationModal({
  open,
  onClose,
  onSuccess,
  forAgent = false,
  containers = [],
  initialMode = "both",
  /** Bulk-create is admin-only; agents get consolidation only. */
  allowBulk,
}) {
  const canBulk = allowBulk !== undefined ? !!allowBulk : !forAgent;
  const [addBulk, setAddBulk] = useState(true);
  const [addConsol, setAddConsol] = useState(true);

  const [shippingMark, setShippingMark] = useState("");
  const [markOptions, setMarkOptions] = useState([]);
  const [markLoading, setMarkLoading] = useState(false);
  const [resolvedOwner, setResolvedOwner] = useState(null);
  const [containerId, setContainerId] = useState("");

  const [bulkNumbersText, setBulkNumbersText] = useState("");
  const [bulkCbmPerLineText, setBulkCbmPerLineText] = useState("");
  const [bulkTotalCbm, setBulkTotalCbm] = useState("");

  const [nextRepackNumber, setNextRepackNumber] = useState("");
  const [dimsInput, setDimsInput] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [widthCm, setWidthCm] = useState("");
  const [lengthCm, setLengthCm] = useState("");
  const [membersText, setMembersText] = useState("");
  const [status, setStatus] = useState("pending");
  const [goodsType, setGoodsType] = useState("normal");
  const [shippingFee, setShippingFee] = useState("");
  const [eta, setEta] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const markDebounceRef = useRef(null);

  const repackPrefix = forAgent
    ? "/buysellapi/agent/trackings"
    : "/buysellapi/trackings";

  useEffect(() => {
    if (!open) return;
    const mode = initialMode || "both";
    if (!canBulk) {
      setAddBulk(false);
      setAddConsol(true);
    } else if (mode === "bulk") {
      setAddBulk(true);
      setAddConsol(false);
    } else if (mode === "consolidation") {
      setAddBulk(false);
      setAddConsol(true);
    } else {
      setAddBulk(true);
      setAddConsol(true);
    }
    setShippingMark("");
    setMarkOptions([]);
    setResolvedOwner(null);
    setContainerId("");
    setBulkNumbersText("");
    setBulkCbmPerLineText("");
    setBulkTotalCbm("");
    setNextRepackNumber("");
    setDimsInput("");
    setHeightCm("");
    setWidthCm("");
    setLengthCm("");
    setMembersText("");
    setStatus("pending");
    setGoodsType("normal");
    setShippingFee("");
    setEta("");
    if (markDebounceRef.current) {
      clearTimeout(markDebounceRef.current);
      markDebounceRef.current = null;
    }
  }, [open, initialMode, canBulk]);

  const calculatedCbm = calcCbm(heightCm, widthCm, lengthCm);

  const applyDimsInput = (raw) => {
    const next = sanitizeDimsInput(raw);
    setDimsInput(next);
    const parsed = parseDimensionTriplet(next);
    if (parsed) {
      setHeightCm(parsed.heightCm);
      setWidthCm(parsed.widthCm);
      setLengthCm(parsed.lengthCm);
    } else {
      setHeightCm("");
      setWidthCm("");
      setLengthCm("");
    }
  };

  const fetchNextRepackNumber = async (markId) => {
    const m = normalizeMarkIdInput(markId);
    if (!m || m.length < 2) {
      setNextRepackNumber("");
      return;
    }
    try {
      const resp = await API.get(`${repackPrefix}/repack/next-number/`, {
        params: { mark_id: m },
      });
      setNextRepackNumber(resp.data?.next_repack_number || "");
    } catch {
      setNextRepackNumber("");
    }
  };

  const resolveOwnerFromMark = async (markOrUsername) => {
    const q = (markOrUsername || "").trim();
    if (!q) {
      setResolvedOwner(null);
      return null;
    }
    try {
      const resp = await API.get(
        `/buysellapi/users/by-mark/${encodeURIComponent(q)}/`
      );
      const ownerObj = {
        id: resp.data.id,
        username: resp.data.username,
        full_name: resp.data.full_name,
      };
      setResolvedOwner(ownerObj);
      return ownerObj;
    } catch (e) {
      setResolvedOwner(null);
      toast.error(
        e?.response?.data?.error ||
          e?.response?.data?.detail ||
          "Could not find user for that mark or username"
      );
      return null;
    }
  };

  const handleMarkChange = (val) => {
    const upper = withMarkPrefix(val);
    setResolvedOwner(null);
    if (markDebounceRef.current) clearTimeout(markDebounceRef.current);
    markDebounceRef.current = setTimeout(async () => {
      try {
        setMarkLoading(true);
        const resp = await API.get("/buysellapi/shipping-marks/", {
          params: { q: normalizeMarkIdInput(upper), page_size: 10 },
        });
        const items = Array.isArray(resp.data?.results)
          ? resp.data.results
          : Array.isArray(resp.data)
          ? resp.data
          : [];
        setMarkOptions(preferExactMarkMatches(items, upper));
        if (addConsol) await fetchNextRepackNumber(upper);
      } catch {
        setMarkOptions([]);
      } finally {
        setMarkLoading(false);
      }
    }, 300);
  };

  const selectMark = async (m) => {
    const markId = m.markId || m.mark_id || "";
    setShippingMark(markId);
    setMarkOptions([]);
    await resolveOwnerFromMark(markId);
    if (addConsol) await fetchNextRepackNumber(markId);
  };

  useEffect(() => {
    if (!open || !addConsol || !shippingMark.trim()) return;
    fetchNextRepackNumber(shippingMark);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addConsol]);

  const submitLabel =
    !addBulk && !addConsol
      ? "Select at least one"
      : addBulk && addConsol
      ? "Create bulk + consolidation"
      : addBulk
      ? "Create bulk"
      : "Create consolidation";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!addBulk && !addConsol) {
      toast.error("Turn on bulk tracking, consolidation, or both");
      return;
    }
    if (!shippingMark.trim()) {
      toast.error("Select a Mark ID");
      return;
    }

    let owner = resolvedOwner;
    if (!owner?.id) {
      owner = await resolveOwnerFromMark(shippingMark.trim());
    }
    if (addBulk && !owner?.id) {
      toast.error(
        "Search and select a Mark ID so we can resolve the owner for bulk tracking"
      );
      return;
    }

    if (addBulk) {
      const numLines = bulkNumbersText
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      const cbmLines = bulkCbmPerLineText
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      const perLine = cbmLines.length > 0;
      if (!bulkNumbersText.trim()) {
        toast.error("Enter tracking numbers for bulk (one per line)");
        return;
      }
      if (perLine && cbmLines.length !== numLines.length) {
        toast.error(
          `CBM lines (${cbmLines.length}) must match tracking lines (${numLines.length}) one-to-one.`
        );
        return;
      }
      let tc = parseFloat(bulkTotalCbm);
      if (!perLine) {
        if (!bulkTotalCbm || !Number.isFinite(tc) || tc <= 0) {
          toast.error(
            "Enter a valid total CBM for the bulk, or fill per-line CBM"
          );
          return;
        }
      } else if (bulkTotalCbm.trim()) {
        if (!Number.isFinite(tc) || tc <= 0) {
          toast.error("Optional total CBM must be valid if provided");
          return;
        }
      }
    }

    let parsedDims = null;
    if (addConsol) {
      parsedDims = parseDimensionTriplet(dimsInput);
      if (!parsedDims) {
        toast.error("Paste size as height*width*length, for example 32*34*64");
        return;
      }
    }

    const containerVal = containerId ? Number(containerId) : null;
    setSubmitting(true);
    let bulkOk = false;
    let consolOk = false;
    let consolData = null;

    try {
      if (addBulk) {
        const cbmLines = bulkCbmPerLineText
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter(Boolean);
        const perLine = cbmLines.length > 0;
        const tc = parseFloat(bulkTotalCbm);
        const payload = {
          owner_id: owner.id,
          tracking_numbers_text: bulkNumbersText,
          container_id: containerVal,
        };
        if (perLine) {
          payload.cbm_per_line_text = bulkCbmPerLineText;
          if (bulkTotalCbm.trim() && Number.isFinite(tc) && tc > 0) {
            payload.total_cbm = tc;
          }
        } else {
          payload.total_cbm = tc;
        }
        await API.post("/buysellapi/admin/trackings/bulk-create/", payload);
        bulkOk = true;
      }

      if (addConsol) {
        const h = parseFloat(parsedDims.heightCm);
        const w = parseFloat(parsedDims.widthCm);
        const l = parseFloat(parsedDims.lengthCm);
        const payload = {
          shipping_mark: normalizeMarkIdInput(shippingMark),
          height_cm: h,
          width_cm: w,
          length_cm: l,
          member_tracking_numbers_text: membersText,
          status,
          goods_type: goodsType,
          eta: eta || null,
          container_id: containerVal,
          shipping_fee: shippingFee ? parseFloat(shippingFee) : null,
          for_agent: forAgent,
        };
        const resp = await API.post(`${repackPrefix}/repack-create/`, payload);
        consolData = resp.data;
        consolOk = true;
      }

      if (bulkOk && consolOk) {
        const repackNo = consolData?.repack?.tracking_number;
        const errCount = (consolData?.member_errors || []).length;
        toast.success(
          errCount
            ? `Bulk + consolidation ${repackNo} created; ${errCount} member line(s) had issues`
            : `Bulk + consolidation ${repackNo || ""} created`.trim()
        );
      } else if (bulkOk) {
        toast.success("Bulk trackings created");
      } else if (consolOk) {
        const repackNo = consolData?.repack?.tracking_number;
        const errCount = (consolData?.member_errors || []).length;
        toast.success(
          errCount
            ? `Consolidation ${repackNo} created; ${errCount} member line(s) had issues`
            : `Consolidation ${repackNo} created`
        );
      }

      onSuccess?.({ bulkOk, consolOk, consolData });
      onClose();
    } catch (err) {
      if (bulkOk && addConsol) {
        toast.error(
          apiErrorMessage(
            err?.response?.data,
            "Bulk was created, but consolidation failed"
          )
        );
        onSuccess?.({ bulkOk: true, consolOk: false });
      } else if (addBulk && !bulkOk) {
        toast.error(apiErrorMessage(err?.response?.data, "Bulk create failed"));
      } else {
        toast.error(
          err.response?.data?.error ||
            err.response?.data?.detail ||
            apiErrorMessage(err?.response?.data, "Failed to create")
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const bothPanels = addBulk && addConsol;
  const panelClass =
    "rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-900/40 p-4 space-y-3 min-w-0";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl p-5 w-full my-6 ${
          bothPanels || (canBulk && (addBulk || addConsol))
            ? "max-w-4xl"
            : "max-w-lg"
        }`}
      >
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Bulk tracking / Consolidation
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400"
          >
            <FaTimesCircle />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Mark ID{" "}
                {resolvedOwner ? (
                  <span className="text-green-600 dark:text-green-400">✓</span>
                ) : null}
                *
              </label>
              <MarkPrefixChooser
                value={shippingMark}
                onChange={handleMarkChange}
              />
              <div className="relative">
                <input
                  type="text"
                  value={shippingMark}
                  onChange={(e) => handleMarkChange(e.target.value)}
                  placeholder="FIM000 or BSC000"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
                {(markLoading || markOptions.length > 0) && (
                  <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-40 overflow-auto">
                    {markLoading && (
                      <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
                        Searching...
                      </div>
                    )}
                    {!markLoading &&
                      markOptions.map((m) => (
                        <button
                          key={m._id || m.id || m.markId}
                          type="button"
                          onClick={() => selectMark(m)}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          {(m.markId || m.mark_id) +
                            (m.name ? `: ${m.name}` : "")}
                        </button>
                      ))}
                  </div>
                )}
              </div>
              {resolvedOwner ? (
                <p className="mt-1 text-xs text-green-700 dark:text-green-400">
                  Owner: {resolvedOwner.full_name} (@{resolvedOwner.username}) —
                  id {resolvedOwner.id}
                </p>
              ) : null}
            </div>

            {containers.length > 0 ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Container (optional)
                </label>
                <select
                  value={containerId}
                  onChange={(e) => setContainerId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">— None —</option>
                  {containers.map((c) => (
                    <option key={c.id || c._id} value={c.id || c._id}>
                      {c.container_number || c.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div />
            )}
          </div>

          {canBulk ? (
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                Include:
              </span>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={addBulk}
                  onChange={(e) => setAddBulk(e.target.checked)}
                  className="rounded border-gray-300"
                />
                Bulk tracking
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={addConsol}
                  onChange={(e) => setAddConsol(e.target.checked)}
                  className="rounded border-gray-300"
                />
                Consolidation
              </label>
            </div>
          ) : null}

          <div
            className={
              bothPanels
                ? "grid gap-4 md:grid-cols-2"
                : "grid gap-4 grid-cols-1"
            }
          >
            {addBulk ? (
              <div className={panelClass}>
                <h4 className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                  Bulk tracking
                </h4>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Tracking numbers (one per line)
                  </label>
                  <textarea
                    rows={bothPanels ? 6 : 5}
                    value={bulkNumbersText}
                    onChange={(e) => setBulkNumbersText(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                    placeholder={"TN001\nTN002\nTN003"}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    CBM per line (optional)
                  </label>
                  <textarea
                    rows={bothPanels ? 4 : 3}
                    value={bulkCbmPerLineText}
                    onChange={(e) => setBulkCbmPerLineText(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                    placeholder="Same order as tracking numbers"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Total CBM (whole bulk)
                  </label>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-1">
                    Required if per-line CBM is empty.
                  </p>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    value={bulkTotalCbm}
                    onChange={(e) => setBulkTotalCbm(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            ) : null}

            {addConsol ? (
              <div className={panelClass}>
                <h4 className="text-sm font-semibold text-violet-700 dark:text-violet-300">
                  Consolidation
                </h4>
                {nextRepackNumber ? (
                  <p className="text-xs font-mono text-indigo-600 dark:text-indigo-400">
                    Next #: <strong>{nextRepackNumber}</strong>
                  </p>
                ) : null}
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Package dimensions (cm) *
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={dimsInput}
                    onChange={(e) => applyDimsInput(e.target.value)}
                    placeholder="32*34*64 or 29*28*31cm"
                    className="w-full px-3 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white bg-white"
                  />
                  <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                    height*width*length — CBM auto-calculates
                  </p>
                  {dimsInput.trim() && !calculatedCbm ? (
                    <p className="mt-1 text-xs text-rose-600 dark:text-rose-300">
                      Use three sizes, e.g. 32*34*64.
                    </p>
                  ) : null}
                </div>
                {calculatedCbm ? (
                  <p className="text-sm text-green-700 dark:text-green-400">
                    CBM: <strong>{calculatedCbm}</strong> m³
                  </p>
                ) : null}
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Member tracking numbers
                  </label>
                  <textarea
                    rows={bothPanels ? 4 : 4}
                    value={membersText}
                    onChange={(e) => setMembersText(e.target.value)}
                    className="w-full px-3 py-2 font-mono text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white bg-white"
                    placeholder={"TN001\nTN002\nTN003"}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Status
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full px-2 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white bg-white"
                    >
                      {statusOptions.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Goods type
                    </label>
                    <select
                      value={goodsType}
                      onChange={(e) => setGoodsType(e.target.value)}
                      className="w-full px-2 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white bg-white"
                    >
                      <option value="normal">Normal</option>
                      <option value="special">Special</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Shipping fee
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={shippingFee}
                      onChange={(e) => setShippingFee(e.target.value)}
                      className="w-full px-2 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      ETA
                    </label>
                    <input
                      type="date"
                      value={eta}
                      onChange={(e) => setEta(e.target.value)}
                      className="w-full px-2 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white bg-white"
                    />
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm border rounded-lg dark:border-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || (!addBulk && !addConsol)}
              className="px-4 py-2 text-sm bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50"
            >
              {submitting ? "Creating..." : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
